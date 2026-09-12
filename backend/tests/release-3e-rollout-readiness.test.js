'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const User = require('../models/User');
const Post = require('../models/Post');
const Outbox = require('../models/ProgressionOutbox');
const Operation = require('../models/ProgressionOperation');
const Projection = require('../models/ProgressionProjection');
const persistence = require('../progression/persistence/service');
const policy = require('../progression/policies/simulation-v1');
const backfill = require('../progression/operations/backfill');
const rebuild = require('../progression/operations/rebuild');
const metrics = require('../progression/operations/metrics');
const { processBatch, processNext } = require('../progression/runtime/worker');
const { startShadowWorker, healthStatus } = require('../progression/runtime/worker');
const { rolloutEnabledFor, rolloutConfig } = require('../progression/operations/rollout');
const alerts = require('../progression/operations/alerts');
const { freshnessPolicy } = require('../progression/product/config');
const { dedicatedWorkerEnabled } = require('../progression/operations/config');
const { getUserProgression } = require('../progression/product/read-service');
const release3b = require('../migrations/004-release-3b-shadow-foundation');
const release3c = require('../migrations/005-release-3c-shadow-ingestion');
const release3e = require('../migrations/006-release-3e-rollout-operations');

let mongo; let user; let identity;
test.before(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 }, binary: { version: '7.0.14' } });
  await mongoose.connect(mongo.getUri(), { autoIndex: false, autoCreate: false });
  await release3b.applyMigration(); await release3c.applyMigration(); await release3e.applyMigration();
  await Promise.all([User.createCollection(), Post.createCollection()]);
  user = await User.create({ username: 'release3e', email: 'release3e@example.com', password: 'test-hash' });
  identity = { policyId: policy.artifact.policyId, version: policy.artifact.version, artifactDigest: policy.artifact.artifactDigest };
  await persistence.appendPolicy(policy.artifact);
});
test.after(async () => { await mongoose.disconnect(); await mongo.stop(); });

test('Release 3E migration is additive, idempotent, transaction-aware, and guarded', async () => {
  const inspection = await release3e.inspectMigration();
  assert.equal(inspection.destructiveChanges, 0); assert.equal(inspection.capability.transactionCapable, true);
  assert.deepEqual(inspection.collection.missingIndexes, []);
  assert.equal((await release3e.applyMigration()).indexesReady, 2);
  await Operation.create({ operationKey: 'retain-me', kind: 'backfill', scope: 'global' });
  await assert.rejects(release3e.rollbackMigration(), /retain operation checkpoints/);
  assert.equal(release3e.classifyDeployment({ maxWireVersion: 21 }).transactionCapable, false);
  assert.equal(release3e.classifyDeployment({ setName: 'rs0' }).transactionCapable, true);
});

test('historical post backfill is deterministic, batched, resumable, and dry-run safe', async () => {
  await Post.create([
    { author: user._id, type: 'text', content: 'one', status: 'published', createdAt: new Date('2026-01-01T00:00:00Z') },
    { author: user._id, type: 'text', content: 'two', status: 'published', createdAt: new Date('2026-01-02T00:00:00Z') },
    { author: user._id, type: 'text', content: 'draft', status: 'draft', createdAt: new Date('2026-01-03T00:00:00Z') }
  ]);
  const check = await backfill.preflight(); assert.equal(check.transactionCapable, true); assert.equal(check.eligiblePublishedPosts, 2);
  let dry = await backfill.runBatch({ operationKey: 'dry', dryRun: true, batchSize: 1 });
  assert.equal(dry.complete, false); assert.equal(await Outbox.countDocuments(), 0);
  do { dry = await backfill.runBatch({ operationKey: 'dry', dryRun: true, batchSize: 1 }); } while (!dry.complete);
  assert.equal(dry.operation.stats.enqueued, 2);
  let applied; do { applied = await backfill.runBatch({ operationKey: 'apply', dryRun: false, batchSize: 1 }); } while (!applied.complete);
  assert.equal(await Outbox.countDocuments(), 2); assert.equal(applied.operation.stats.enqueued, 2);
  assert.equal((await backfill.runBatch({ operationKey: 'apply', dryRun: false })).complete, true);
});

test('worker is bounded, recovers stale locks, caps retries, and exposes internal health', async () => {
  const results = await processBatch({ batchSize: 2, concurrency: 2 });
  assert.equal(results.length, 2); assert.ok(results.every(item => item.status === 'processed'));
  await Outbox.create({ eventId: 'e'.repeat(32), event: { invalid: true }, evidence: [], status: 'processing', attempts: 1, lockedAt: new Date(0), availableAt: new Date(0) });
  const failed = await processNext({ now: new Date(), maxAttempts: 2 }); assert.equal(failed.status, 'failed');
  assert.equal(await processNext({ now: new Date('2099-01-01'), maxAttempts: 2 }), null);
  const view = await metrics.snapshot();
  assert.equal(view.outbox.processed, 2); assert.equal(view.outbox.failed, 1); assert.ok(view.worker.staleLockRecoveryCount >= 1);
  const stop = startShadowWorker({ intervalMs: 250, batchSize: 1, concurrency: 1 });
  assert.equal(healthStatus().running, true); await stop(); assert.equal(healthStatus().running, false);
});

test('dedicated worker fails closed for every operations and shadow flag combination', () => {
  assert.equal(dedicatedWorkerEnabled({ PROGRESSION_OPERATIONS_ENABLED: 'false', PROGRESSION_SHADOW_WORKER_ENABLED: 'false' }), false);
  assert.equal(dedicatedWorkerEnabled({ PROGRESSION_OPERATIONS_ENABLED: 'false', PROGRESSION_SHADOW_WORKER_ENABLED: 'true' }), false);
  assert.equal(dedicatedWorkerEnabled({ PROGRESSION_OPERATIONS_ENABLED: 'true', PROGRESSION_SHADOW_WORKER_ENABLED: 'false' }), false);
  assert.equal(dedicatedWorkerEnabled({ PROGRESSION_OPERATIONS_ENABLED: 'true', PROGRESSION_SHADOW_WORKER_ENABLED: 'true' }), true);
  assert.equal(dedicatedWorkerEnabled({}), false);
});

test('worker pause and restart preserves pending outbox data and operation checkpoints', async () => {
  const pending = await Outbox.create({ eventId: 'p'.repeat(32), event: { pending: true }, evidence: [], status: 'pending', availableAt: new Date('2099-01-01') });
  const checkpoint = await Operation.create({ operationKey: 'pause-restart', kind: 'rebuild', scope: 'global', checkpoint: { processed: 7 } });
  const stop = startShadowWorker({ intervalMs: 250, batchSize: 1, concurrency: 1 });
  assert.equal(healthStatus().running, true);
  await stop();
  assert.equal(healthStatus().running, false);
  assert.equal((await Outbox.findById(pending._id)).status, 'pending');
  assert.equal((await Operation.findById(checkpoint._id)).checkpoint.processed, 7);
  const stopRestarted = startShadowWorker({ intervalMs: 250, batchSize: 1, concurrency: 1 });
  assert.equal(healthStatus().running, true);
  await stopRestarted();
  assert.equal(healthStatus().running, false);
  assert.ok(await Outbox.exists({ _id: pending._id }));
  assert.ok(await Operation.exists({ _id: checkpoint._id }));
});

test('rollout stages fail closed, support explicit cohorts, and roll back immediately', () => {
  const user = { _id: 'user-1', username: 'release3e', isAdmin: false };
  const base = { USER_FACING_PROGRESSION_ENABLED: 'true', VITE_USER_FACING_PROGRESSION_ENABLED: 'true' };
  assert.equal(rolloutEnabledFor(user, {}), false);
  assert.equal(rolloutEnabledFor(user, { ...base, PROGRESSION_ROLLOUT_STAGE: '0' }), false);
  assert.equal(rolloutEnabledFor({ ...user, isAdmin: true }, { ...base, PROGRESSION_ROLLOUT_STAGE: '1' }), true);
  assert.equal(rolloutEnabledFor(user, { ...base, PROGRESSION_ROLLOUT_STAGE: '2', PROGRESSION_ROLLOUT_SMALL_COHORT: 'user-1' }), true);
  assert.equal(rolloutEnabledFor(user, { ...base, PROGRESSION_ROLLOUT_STAGE: '3', PROGRESSION_ROLLOUT_LARGE_COHORT: 'someone-else' }), false);
  assert.equal(rolloutEnabledFor(user, { ...base, PROGRESSION_ROLLOUT_STAGE: '4' }), true);
  assert.equal(rolloutEnabledFor(user, { ...base, USER_FACING_PROGRESSION_ENABLED: 'false', PROGRESSION_ROLLOUT_STAGE: '4' }), false);
  assert.equal(rolloutConfig({ PROGRESSION_ROLLOUT_STAGE: 'invalid' }).stage, 0);
});

test('alert contract detects backlog, worker, rebuild, stale, stalled, migration, and transaction failures', () => {
  const snapshot = {
    outbox: { oldestPendingAgeSeconds: 901 }, worker: { consecutiveFailures: 3 },
    projections: { availableProjectionCount: 90, unavailableProjectionCount: 10, staleProjectionCount: 2, rebuildFailures: 1, checkpoint: { operationKey: 'rebuild', status: 'running', lastHeartbeatAt: new Date(0).toISOString() } },
    backfill: { operationKey: 'backfill', status: 'pending', lastHeartbeatAt: new Date(0).toISOString() }
  };
  const found = alerts.evaluate(snapshot, { now: new Date(), migration: { status: 'failed', transactionCapable: false } });
  for (const code of ['OUTBOX_BACKLOG_AGE', 'WORKER_REPEATED_FAILURE', 'PROJECTION_REBUILD_FAILURE', 'EXCESSIVE_STALE_PROJECTIONS', 'OPERATION_STALLED', 'MIGRATION_FAILURE', 'TRANSACTION_CAPABILITY_FAILURE']) assert.ok(found.some(item => item.code === code), code);
});

test('global and per-user rebuilds use persisted policy, checkpoint, resume, and isolate missing users', async () => {
  let result = await rebuild.runGlobalBatch({ operationKey: 'global-rebuild', policyIdentity: identity, batchSize: 1 });
  while (!result.complete) result = await rebuild.runGlobalBatch({ operationKey: 'global-rebuild', policyIdentity: identity, batchSize: 1 });
  assert.equal(result.operation.status, 'complete'); assert.ok(await Projection.exists({ scope: 'personal', subjectId: String(user._id) }));
  assert.deepEqual(await rebuild.runUser({ userId: String(user._id), policyIdentity: identity, operationKey: 'one-user' }), { skipped: false, available: true });
  assert.deepEqual(await rebuild.runUser({ userId: String(user._id), policyIdentity: identity, operationKey: 'one-user' }), { skipped: true });
});

test('global rebuild isolates failures, finishes scanning, and exhausts a bounded retry budget', async () => {
  const other = await User.create({ username: 'release3e_other', email: 'release3e-other@example.com', password: 'test-hash' });
  const missingPolicy = { policyId: 'missing', version: '1', artifactDigest: `sha256:${'f'.repeat(64)}` };
  let result = await rebuild.runGlobalBatch({ operationKey: 'failing-rebuild', policyIdentity: missingPolicy, batchSize: 1, maxFailureRetries: 1 });
  assert.equal(result.operation.checkpoint.scanComplete, false);
  result = await rebuild.runGlobalBatch({ operationKey: 'failing-rebuild', policyIdentity: missingPolicy, batchSize: 1, maxFailureRetries: 1 });
  assert.equal(result.operation.checkpoint.scanComplete, false);
  result = await rebuild.runGlobalBatch({ operationKey: 'failing-rebuild', policyIdentity: missingPolicy, batchSize: 1, maxFailureRetries: 1 });
  assert.equal(result.operation.checkpoint.scanComplete, true);
  result = await rebuild.runGlobalBatch({ operationKey: 'failing-rebuild', policyIdentity: missingPolicy, batchSize: 1, maxFailureRetries: 1 });
  assert.equal(result.complete, true); assert.equal(result.succeeded, false); assert.equal(result.operation.status, 'failed');
  assert.ok(result.operation.checkpoint.failedSubjectIds.length > 0);
  await User.deleteOne({ _id: other._id });
});

test('versioned freshness is conservative, configurable, and public state excludes operations', async () => {
  const original = process.env.PROGRESSION_PRODUCT_STALE_AFTER_MS;
  process.env.PROGRESSION_PRODUCT_STALE_AFTER_MS = '60000';
  try {
    assert.equal(freshnessPolicy().version, 'release-3e-v1');
    await Projection.updateMany({ scope: 'personal', subjectId: String(user._id) }, { $set: { rebuiltAt: new Date(Date.now() - 120000) } });
    const view = await getUserProgression(String(user._id));
    assert.equal(view.freshness.state, 'stale'); assert.equal(JSON.stringify(view).includes('operationKey'), false);
  } finally { if (original == null) delete process.env.PROGRESSION_PRODUCT_STALE_AFTER_MS; else process.env.PROGRESSION_PRODUCT_STALE_AFTER_MS = original; }
});
