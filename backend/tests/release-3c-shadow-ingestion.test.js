'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const fs = require('node:fs');
const path = require('node:path');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const Post = require('../models/Post');
const Outbox = require('../models/ProgressionOutbox');
const ActivityEvent = require('../models/ProgressionActivityEvent');
const Evidence = require('../models/ProgressionEvidence');
const Faction = require('../models/Faction');
const FactionMembership = require('../models/FactionMembership');
const persistence = require('../progression/persistence/service');
const { withProgressionOutbox, enqueue } = require('../progression/runtime/outbox');
const { produceActivity } = require('../progression/runtime/event-producer');
const { processNext, operationalMetrics, rebuildShadowProjection } = require('../progression/runtime/worker');
const release3b = require('../migrations/004-release-3b-shadow-foundation');
const release3c = require('../migrations/005-release-3c-shadow-ingestion');

let mongo;
const actorId = new mongoose.Types.ObjectId();
const beneficiaryId = new mongoose.Types.ObjectId();

test.before(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 }, binary: { version: '7.0.14' } });
  await mongoose.connect(mongo.getUri(), { autoIndex: false, autoCreate: false });
  await release3b.applyMigration(); await release3c.applyMigration();
  await Promise.all([Post.createCollection(), Faction.createCollection(), FactionMembership.createCollection()]);
});

test('runtime producer snapshots authoritative faction membership independently', async () => {
  const faction = await Faction.create({ key: 'neon', name: 'Neon Test' });
  const membership = await FactionMembership.create({ user: beneficiaryId, faction: faction._id, joinedAt: new Date('2026-09-01T00:00:00.000Z') });
  const payload = await produceActivity({ ...creationSpec(), actorId, beneficiaryId, subject: { type: 'user', id: String(beneficiaryId) } });
  assert.equal(payload.event.affiliations.actor.state, 'unaffiliated');
  assert.equal(payload.event.affiliations.beneficiary.factionId, 'neon');
  assert.equal(payload.event.affiliations.beneficiary.membershipRef, String(membership._id));
});
test.after(async () => { await mongoose.disconnect(); await mongo.stop(); });

function creationSpec(objectId = new mongoose.Types.ObjectId()) {
  return { principal: 'user', eventType: 'creation.published', activityClass: 'CREATE', actorId, beneficiaryId: actorId,
    occurredAt: '2026-09-04T12:00:00.000Z', subject: { type: 'user', id: String(actorId) }, object: { type: 'post', id: String(objectId) },
    source: { objectType: 'post', objectId, transition: 'created', version: '1' } };
}

test('runtime producer creates canonical, deterministic, unaffiliated shadow events', async () => {
  const spec = creationSpec();
  const first = await produceActivity(spec); const second = await produceActivity(spec);
  assert.deepEqual(second, first);
  assert.equal(first.event.provenance.producer, 'user-api');
  assert.equal(first.event.affiliations.actor.state, 'unaffiliated');
  assert.equal(first.event.affiliations.beneficiary.state, 'unaffiliated');
  await assert.rejects(produceActivity({ ...spec, principal: 'browser' }), /PRODUCER_UNAUTHORIZED/);
});

test('domain write and outbox entry commit atomically in one caller-owned transaction', async () => {
  const postId = new mongoose.Types.ObjectId();
  await withProgressionOutbox(async ({ session, enqueue: add }) => {
    await Post.create([{ _id: postId, author: actorId, type: 'text', content: 'shadow test' }], { session });
    await add(creationSpec(postId));
  });
  assert.ok(await Post.exists({ _id: postId })); assert.ok(await Outbox.exists({ eventId: (await produceActivity(creationSpec(postId))).event.eventId }));

  const rolledBackId = new mongoose.Types.ObjectId();
  await assert.rejects(withProgressionOutbox(async ({ session, enqueue: add }) => {
    await Post.create([{ _id: rolledBackId, author: actorId, type: 'text', content: 'rollback' }], { session });
    await add(creationSpec(rolledBackId)); throw new Error('domain failure');
  }), /domain failure/);
  assert.equal(await Post.exists({ _id: rolledBackId }), null); assert.equal(await Outbox.exists({ 'event.object.id': String(rolledBackId) }), null);
});

test('enqueue requires and reuses an active caller session', async () => {
  await assert.rejects(enqueue(creationSpec()), /ACTIVE_SESSION_REQUIRED/);
  const session = await mongoose.startSession();
  const originalStartSession = mongoose.startSession;
  try {
    await session.withTransaction(async () => {
      mongoose.startSession = async () => { throw new Error('second session started'); };
      assert.ok(await enqueue(creationSpec(), { session }));
    });
  } finally { mongoose.startSession = originalStartSession; await session.endSession(); }
});

test('worker is restart-safe, retry-safe, and duplicate delivery is idempotent', async () => {
  const pending = await Outbox.findOne({ status: 'pending' }).sort({ createdAt: 1 });
  const first = await processNext({ now: new Date('2099-09-05T00:00:00.000Z') });
  assert.equal(first.status, 'processed');
  assert.ok(await ActivityEvent.exists({ eventId: pending.eventId }));
  await Outbox.updateOne({ _id: pending._id }, { $set: { status: 'pending', availableAt: new Date(0), processedAt: null } });
  const replay = await processNext({ now: new Date('2099-09-05T00:01:00.000Z') });
  assert.equal(replay.status, 'processed'); assert.equal(await ActivityEvent.countDocuments({ eventId: pending.eventId }), 1);

  await Outbox.create({ eventId: 'f'.repeat(32), event: { invalid: true }, evidence: [], availableAt: new Date(0) });
  let failed;
  do { failed = await processNext({ now: new Date('2099-09-05T00:02:00.000Z') }); } while (failed && failed.eventId !== 'f'.repeat(32));
  assert.equal(failed.status, 'failed');
  const stored = await Outbox.findOne({ eventId: 'f'.repeat(32) });
  assert.equal(stored.status, 'failed'); assert.match(stored.lastError, /unsupported|requires|properties/);

  const metrics = await operationalMetrics();
  assert.ok(metrics.processed >= 1); assert.ok(metrics.failed >= 1); assert.ok(metrics.retries >= 1);
  assert.match(metrics.lastSuccessfulProcessingTime, /^\d{4}-/);
  assert.ok(metrics.sources.some(source => source.producer === 'user-api' && source.sourceType === 'post'));
  await assert.rejects(rebuildShadowProjection({}), /persisted policy identity/);
});

test('outbox canonical payload cannot be silently rewritten', async () => {
  const item = await Outbox.findOne({ status: 'processed' });
  await assert.rejects(Outbox.updateOne({ _id: item._id }, { $set: { 'event.actorId': String(beneficiaryId) } }), /payload is immutable/);
});

test('finalized economic handoff binds evidence without exposing payment behavior', async () => {
  const tx = `0x${'a'.repeat(64)}`;
  const payload = await produceActivity({ principal: 'payments', eventType: 'economy.support.final', activityClass: 'TRANSACT', actorId, beneficiaryId,
    occurredAt: '2026-09-04T13:00:00.000Z', subject: { type: 'user', id: String(beneficiaryId) }, object: { type: 'transaction', id: tx }, sourceEventId: tx,
    source: { objectType: 'tip', objectId: new mongoose.Types.ObjectId(), transition: 'finalized', version: '84532:10' }, economic: { amountMinor: '1000000', currency: 'USDC', state: 'finalized' },
    evidence: [{ type: 'economic_finality', contractVersion: '1.0.0', subject: { type: 'transaction', id: tx }, generation: '1', confidence: 1,
      lineage: ['tip:test', `tx:${tx}`], privacyClassification: 'restricted', retentionClass: 'audit', body: { state: 'finalized', authorityRef: 'payment-service', transactionRef: tx, blockRef: '10', confirmationDepth: 3, amountMinor: '1000000', currency: 'USDC', payerId: String(actorId), beneficiaryId: String(beneficiaryId), recipientId: String(beneficiaryId), direction: 'payer_to_beneficiary', amountSign: 'non_negative_magnitude' } }]
  });
  assert.equal(payload.event.economic.finalityEvidenceRef, payload.evidence[0].evidenceId);
  assert.equal(payload.event.economic.amountMinor, '1000000');
});

test('Release 3C migration is additive and protects non-empty rollback', async () => {
  const inspection = await release3c.inspectMigration(); assert.equal(inspection.destructiveChanges, 0); assert.deepEqual(inspection.collection.missingIndexes, []);
  await assert.rejects(release3c.rollbackMigration(), /contains data/);
});

test('runtime remains shadow-only while Release 3D owns the gated read route', () => {
  assert.equal(persistence.SHADOW_MODE, true); assert.equal(persistence.USER_FACING_PROGRESSION_ENABLED, false);
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  assert.equal(server.includes("app.use('/api/progression'"), true);
});
