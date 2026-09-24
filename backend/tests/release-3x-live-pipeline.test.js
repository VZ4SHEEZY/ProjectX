'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { buildScenarioBundle } = require('../progression/simulator/scenarios');
const policy = require('../progression/policies/simulation-v1');
const { canonicalEvent } = require('../progression/contracts');
const { canonicalEvidence } = require('../progression/evidence');
const persistence = require('../progression/persistence/service');
const repository = require('../progression/persistence/repository');
const { processNext, healthStatus } = require('../progression/runtime/worker');
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

function envelope(event, bundle) {
  return { eventId: event.eventId, event, evidence: event.evidenceRefs.map(ref => bundle.evidenceByRef[ref]), availableAt: new Date(0) };
}

function unaffiliatedCreate(bundle) {
  const base = bundle.events.find(event => event.beneficiaryId === 'original_creator' && event.activityClass === 'CREATE');
  const timestamp = '2026-08-06T00:00:00.000Z';
  const eventInput = {
    schemaVersion: base.schemaVersion, eventType: base.eventType, activityClass: base.activityClass,
    actorId: 'unaffiliated_creator', subject: { type: 'synthetic_persona', id: 'unaffiliated_creator' },
    object: { type: 'synthetic_activity', id: 'unaffiliated_creator-0' }, beneficiaryId: 'unaffiliated_creator',
    occurredAt: timestamp, ingestedAt: timestamp,
    affiliations: {
      actor: { state: 'unaffiliated', effectiveAt: timestamp, source: 'release-3a-simulator' },
      beneficiary: { state: 'unaffiliated', effectiveAt: timestamp, source: 'release-3a-simulator' }
    },
    provenance: base.provenance,
    sourceIdentity: { ...base.sourceIdentity, objectId: 'unaffiliated_creator-0' },
    evidenceRefs: [], economic: null, correction: null, facts: {}
  };
  const originals = base.evidenceRefs.map(ref => bundle.evidenceByRef[ref]);
  const evidence = originals.map(item => canonicalEvidence({
    type: item.type, contractVersion: item.contractVersion,
    subject: item.subject.type === 'synthetic_persona'
      ? { type: 'synthetic_persona', id: 'unaffiliated_creator' }
      : { type: 'synthetic_activity', id: 'unaffiliated_creator-0' },
    producer: item.producer, generation: item.generation, observedAt: timestamp,
    confidence: item.confidence, lineage: item.lineage, supersedesEvidenceId: null,
    privacyClassification: item.privacyClassification, retentionClass: item.retentionClass, body: item.body
  }));
  const event = canonicalEvent({ ...eventInput, evidenceRefs: evidence.map(item => item.evidenceId) });
  return { event, evidence };
}

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
  await Outbox.create([envelope(unrelated, bundle), envelope(selected, bundle)]);
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

  await Outbox.updateOne({ eventId: unrelated.eventId }, { $set: { availableAt: new Date(0) } });
  const retry = await processNext({ now: new Date('2099-01-01T00:03:00.000Z'), policyIdentity: identity, processingScope: { mode: 'bounded', eventIds: [unrelated.eventId] } });
  assert.equal(retry.status, 'processed');
  assert.equal(await ActivityEvent.countDocuments({ eventId: unrelated.eventId }), 1);
  assert.equal(await Decision.countDocuments({ eventId: unrelated.eventId }), 1);
  assert.equal(await Contribution.countDocuments({ eventId: unrelated.eventId }), 1);
  assert.equal(await Projection.countDocuments({ scope: 'personal', subjectId: unrelated.beneficiaryId }), 1);
  assert.equal(await Projection.countDocuments({ scope: 'faction' }), 1, 'Unaffiliated retry must not add a faction projection');
});

test('complete staging matrix preserves aggregation, isolation, stable retries, and rebuild reconciliation', async () => {
  await mongoose.connection.dropDatabase();
  await foundation.applyMigration();
  await ingestion.applyMigration();
  await livePipeline.applyMigration();
  await persistence.appendPolicy(policy.artifact);
  const bundle = buildScenarioBundle();
  const chrome = bundle.events.find(event => event.beneficiaryId === 'casual');
  const affiliatedCreate = bundle.events.find(event => event.beneficiaryId === 'original_creator' && event.activityClass === 'CREATE');
  const sameFactionUser = bundle.events.find(event => event.beneficiaryId === 'cross_faction_viral');
  const unaffiliated = unaffiliatedCreate(bundle);
  const generatedBundle = { evidenceByRef: Object.fromEntries(unaffiliated.evidence.map(item => [item.evidenceId, item])) };

  await Outbox.create([envelope(chrome, bundle), envelope(affiliatedCreate, bundle)]);
  const chromeResult = await processNext({ now: new Date('2099-02-01T00:00:00.000Z'), policyIdentity: identity, processingScope: { mode: 'bounded', eventIds: [chrome.eventId] } });
  assert.equal(chromeResult.status, 'processed');
  assert.equal(await Outbox.countDocuments({ eventId: affiliatedCreate.eventId, status: 'pending' }), 1, 'bounded mode must leave concurrent unrelated activity untouched');

  const createResult = await processNext({ now: new Date('2099-02-01T00:01:00.000Z'), policyIdentity: identity, processingScope: { mode: 'bounded', eventIds: [affiliatedCreate.eventId] } });
  assert.equal(createResult.status, 'processed');
  assert.equal(createResult.advancement.contribution.personal > 0, true);
  assert.equal(createResult.advancement.contribution.faction > 0, true);
  assert.equal(createResult.advancement.faction.contributors[affiliatedCreate.beneficiaryId], Math.round(createResult.advancement.contribution.faction * 100) / 100);

  await Outbox.create(envelope(sameFactionUser, bundle));
  const sameFactionResult = await processNext({ now: new Date('2099-02-01T00:02:00.000Z'), policyIdentity: identity, processingScope: { mode: 'bounded', eventIds: [sameFactionUser.eventId] } });
  assert.equal(sameFactionResult.status, 'processed');
  assert.deepEqual(Object.keys(sameFactionResult.advancement.faction.contributors).sort(), ['cross_faction_viral', 'original_creator']);
  assert.equal(sameFactionResult.advancement.faction.total, Math.round((createResult.advancement.contribution.faction + sameFactionResult.advancement.contribution.faction) * 100) / 100);

  await Outbox.create(envelope(unaffiliated.event, generatedBundle));
  const unaffiliatedResult = await processNext({ now: new Date('2099-02-01T00:03:00.000Z'), policyIdentity: identity, processingScope: { mode: 'bounded', eventIds: [unaffiliated.event.eventId] } });
  assert.equal(unaffiliatedResult.status, 'processed');
  assert.equal(unaffiliatedResult.advancement.contribution.personal > 0, true);
  assert.equal(unaffiliatedResult.advancement.contribution.faction, 0);
  assert.equal(unaffiliatedResult.advancement.faction, null);
  assert.equal(await Projection.countDocuments({ scope: 'faction' }), 3, 'Unaffiliated CREATE must not mutate faction projections');

  const countsBeforeRetry = {
    events: await ActivityEvent.countDocuments({}),
    decisions: await Decision.countDocuments({}),
    contributions: await Contribution.countDocuments({}),
    projections: await Projection.countDocuments({})
  };
  await Outbox.updateOne({ eventId: affiliatedCreate.eventId }, { $set: { status: 'pending', availableAt: new Date(0), processedAt: null } });
  const delayedDuplicate = await processNext({ now: new Date('2099-02-01T00:04:00.000Z'), policyIdentity: identity, processingScope: { mode: 'bounded', eventIds: [affiliatedCreate.eventId] } });
  assert.equal(delayedDuplicate.status, 'processed');
  assert.deepEqual({
    events: await ActivityEvent.countDocuments({}),
    decisions: await Decision.countDocuments({}),
    contributions: await Contribution.countDocuments({}),
    projections: await Projection.countDocuments({})
  }, countsBeforeRetry, 'a delayed duplicate must retain the original live identity and effects');

  const calculated = await persistence.calculateProjection({ policyIdentity: identity });
  for (const [subjectId, checkpoint] of Object.entries(calculated.projection.personal)) {
    const live = await Projection.findOne({ scope: 'personal', subjectId }).sort({ rebuiltAt: -1 }).select('+checkpoint').lean();
    assert.deepEqual(live.checkpoint, checkpoint, `live personal checkpoint drifted for ${subjectId}`);
  }
  for (const [subjectId, checkpoint] of Object.entries(calculated.projection.faction)) {
    const live = await Projection.findOne({ scope: 'faction', subjectId }).sort({ rebuiltAt: -1 }).select('+checkpoint').lean();
    assert.deepEqual(live.checkpoint, checkpoint, `live faction checkpoint drifted for ${subjectId}`);
  }
  await persistence.rebuildProjection({ policyIdentity: identity, rebuiltAt: new Date('2099-02-01T00:05:00.000Z') });
  for (const [subjectId, checkpoint] of Object.entries(calculated.projection.personal)) {
    const rebuilt = await persistence.getProjection('personal', subjectId, calculated.projection.projectionContext.projectionContextId);
    assert.deepEqual(rebuilt.checkpoint, checkpoint);
  }
  for (const [subjectId, checkpoint] of Object.entries(calculated.projection.faction)) {
    const rebuilt = await persistence.getProjection('faction', subjectId, calculated.projection.projectionContext.projectionContextId);
    assert.deepEqual(rebuilt.checkpoint, checkpoint);
  }

  const health = healthStatus();
  assert.equal(health.liveEffects.events > 0, true);
  assert.equal(health.liveEffects.decisions > 0, true);
  assert.equal(health.liveEffects.contributions > 0, true);
  assert.equal(health.processingLatencyMs.last >= 0, true);
  assert.equal(health.processingLatencyMs.average >= 0, true);
  assert.equal(health.processingLatencyMs.max >= health.processingLatencyMs.last, true);
});
