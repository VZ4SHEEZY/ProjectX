'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { buildScenarioBundle } = require('../progression/simulator/scenarios');
const policy = require('../progression/policies/simulation-v1');
const persistence = require('../progression/persistence/service');
const repository = require('../progression/persistence/repository');
const { processNext } = require('../progression/runtime/worker');
const { processingScope } = require('../progression/operations/config');
const Outbox = require('../models/ProgressionOutbox');
const ActivityEvent = require('../models/ProgressionActivityEvent');
const Decision = require('../models/ProgressionQualificationDecision');
const Contribution = require('../models/ProgressionContributionResult');
const Projection = require('../models/ProgressionProjection');
const foundation = require('../migrations/004-release-3b-shadow-foundation');
const ingestion = require('../migrations/005-release-3c-shadow-ingestion');
const livePipeline = require('../migrations/007-release-3x-live-pipeline');

let mongo;
let selected;
let unrelated;
let identity;

test.before(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 }, binary: { version: '7.0.14' } });
  await mongoose.connect(mongo.getUri(), { autoIndex: false, autoCreate: false });
  await foundation.applyMigration();
  await ingestion.applyMigration();
  await livePipeline.applyMigration();
  await persistence.appendPolicy(policy.artifact);
  identity = { policyId: policy.artifact.policyId, version: policy.artifact.version, artifactDigest: policy.artifact.artifactDigest };
  const bundle = buildScenarioBundle();
  selected = bundle.events.find(event => event.beneficiaryId === 'cross_faction_viral');
  unrelated = bundle.events.find(event => event.beneficiaryId === 'unaffiliated_power');
  const envelope = event => ({ eventId: event.eventId, event, evidence: event.evidenceRefs.map(ref => bundle.evidenceByRef[ref]), availableAt: new Date(0) });
  await Outbox.create([envelope(unrelated), envelope(selected)]);
});

test.after(async () => { await mongoose.disconnect(); await mongo.stop(); });

test('bounded mode is explicit and fails closed on absent or malformed identities', () => {
  assert.deepEqual(processingScope({ PROGRESSION_PROCESSING_MODE: 'normal' }), { mode: 'normal', eventIds: [] });
  assert.throws(() => processingScope({ PROGRESSION_PROCESSING_MODE: 'bounded' }), /requires 1-25/);
  assert.throws(() => processingScope({ PROGRESSION_PROCESSING_MODE: 'bounded', PROGRESSION_BOUNDED_EVENT_IDS: 'not-an-event' }), /requires 1-25/);
  assert.deepEqual(processingScope({ PROGRESSION_PROCESSING_MODE: 'bounded', PROGRESSION_BOUNDED_EVENT_IDS: selected.eventId }), { mode: 'bounded', eventIds: [selected.eventId] });
});

test('one bounded outbox item advances through the canonical live pipeline atomically', async () => {
  const result = await processNext({
    now: new Date('2099-01-01T00:00:00.000Z'),
    policyIdentity: identity,
    processingScope: { mode: 'bounded', eventIds: [selected.eventId] }
  });
  assert.equal(result.status, 'processed');
  assert.equal(result.eventId, selected.eventId);
  assert.ok(result.advancement.decisionId);
  assert.equal(await Outbox.countDocuments({ eventId: selected.eventId, status: 'processed' }), 1);
  assert.equal(await Outbox.countDocuments({ eventId: unrelated.eventId, status: 'pending' }), 1);
  assert.equal(await ActivityEvent.countDocuments({ eventId: selected.eventId }), 1);
  assert.equal(await ActivityEvent.countDocuments({ eventId: unrelated.eventId }), 0);
  assert.equal(await Decision.countDocuments({ eventId: selected.eventId }), 1);
  assert.equal(await Contribution.countDocuments({ eventId: selected.eventId }), 1);
  assert.equal(await Projection.countDocuments({ scope: 'personal', subjectId: selected.beneficiaryId }), 1);
  assert.equal(await Projection.countDocuments({ scope: 'faction', subjectId: selected.affiliations.beneficiary.factionId }), 1);
});

test('duplicate delivery has exactly-once logical effects and replay reconciles', async () => {
  await Outbox.updateOne({ eventId: selected.eventId }, { $set: { status: 'pending', availableAt: new Date(0), processedAt: null } });
  const retry = await processNext({ now: new Date('2099-01-01T00:01:00.000Z'), policyIdentity: identity, processingScope: { mode: 'bounded', eventIds: [selected.eventId] } });
  assert.equal(retry.status, 'processed');
  assert.equal(await ActivityEvent.countDocuments({ eventId: selected.eventId }), 1);
  assert.equal(await Decision.countDocuments({ eventId: selected.eventId }), 1);
  assert.equal(await Contribution.countDocuments({ eventId: selected.eventId }), 1);
  assert.equal(await Projection.countDocuments({ scope: 'personal', subjectId: selected.beneficiaryId }), 1);
  assert.equal(await Projection.countDocuments({ scope: 'faction', subjectId: selected.affiliations.beneficiary.factionId }), 1);

  const plan = await persistence.calculateProjection({ policyIdentity: identity });
  assert.deepEqual(retry.advancement.personal, plan.projection.personal[selected.beneficiaryId]);
  assert.deepEqual(retry.advancement.faction, plan.projection.faction[selected.affiliations.beneficiary.factionId]);
});

test('derived-state failure rolls back event ingestion and leaves an observable retry', async () => {
  const original = repository.storeProjection;
  try {
    repository.storeProjection = async () => { throw new Error('simulated projection failure'); };
    const result = await processNext({ now: new Date('2099-01-01T00:02:00.000Z'), policyIdentity: identity, processingScope: { mode: 'bounded', eventIds: [unrelated.eventId] } });
    assert.equal(result.status, 'failed');
    assert.match(result.error.message, /simulated projection failure/);
  } finally {
    repository.storeProjection = original;
  }
  assert.equal(await ActivityEvent.countDocuments({ eventId: unrelated.eventId }), 0);
  assert.equal(await Decision.countDocuments({ eventId: unrelated.eventId }), 0);
  assert.equal(await Contribution.countDocuments({ eventId: unrelated.eventId }), 0);
  const outbox = await Outbox.findOne({ eventId: unrelated.eventId }).lean();
  assert.equal(outbox.status, 'failed');
  assert.match(outbox.lastError, /simulated projection failure/);
});
