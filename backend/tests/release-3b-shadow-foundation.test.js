'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { canonicalEvent } = require('../progression/contracts');
const { qualifyLedger } = require('../progression/qualification');
const { project } = require('../progression/projection');
const policy = require('../progression/policies/simulation-v1');
const { buildScenarioBundle } = require('../progression/simulator/scenarios');
const service = require('../progression/persistence/service');
const ActivityEvent = require('../models/ProgressionActivityEvent');
const Evidence = require('../models/ProgressionEvidence');
const Decision = require('../models/ProgressionQualificationDecision');
const Correction = require('../models/ProgressionCorrectionRelationship');
const Contribution = require('../models/ProgressionContributionResult');
const Projection = require('../models/ProgressionProjection');
const { DEFINITIONS, inspectMigration, applyMigration, rollbackMigration } = require('../migrations/004-release-3b-shadow-foundation');

let mongo;
let fixture;

test.before(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 }, binary: { version: '7.0.14' } });
  await mongoose.connect(mongo.getUri(), { autoIndex: false, autoCreate: false });
  const bundle = buildScenarioBundle();
  const selected = [
    bundle.events.find(event => event.beneficiaryId === 'cross_faction_viral'),
    bundle.events.find(event => event.beneficiaryId === 'unaffiliated_power')
  ];
  const evidence = selected.flatMap(event => event.evidenceRefs.map(ref => bundle.evidenceByRef[ref]));
  fixture = { events: selected, evidence, evidenceByRef: Object.fromEntries(evidence.map(item => [item.evidenceId, item])) };
});

test.after(async () => { await mongoose.disconnect(); await mongo.stop(); });

test('migration is additive, deterministic, indexed, and reversible when empty', async () => {
  const preflight = await inspectMigration();
  assert.equal(preflight.destructiveChanges, 0);
  assert.equal(preflight.collections.every(item => !item.exists), true);
  const applied = await applyMigration();
  assert.equal(applied.createdCollections.length, DEFINITIONS.length);
  assert.equal((await inspectMigration()).collections.every(item => item.missingIndexes.length === 0), true);
  const repeated = await applyMigration();
  assert.equal(repeated.createdCollections.length, 0);
  const rolledBack = await rollbackMigration();
  assert.equal(rolledBack.droppedCollections.length, DEFINITIONS.length);
  await applyMigration();
});

test('activity and evidence append canonically and duplicate delivery is idempotent', async () => {
  for (const evidence of fixture.evidence) await service.appendEvidence(evidence);
  for (const event of fixture.events) await service.appendEvent(event);
  await service.appendEvent(fixture.events[0]);
  await service.appendEvidence(fixture.evidence[0]);
  assert.equal(await ActivityEvent.countDocuments(), 2);
  assert.equal(await Evidence.countDocuments(), fixture.evidence.length);
  const ordered = await service.getOrderedReplayInputs();
  assert.deepEqual(ordered.events.map(event => event.eventId), [...fixture.events].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt) || a.provenance.producer.localeCompare(b.provenance.producer) || a.eventId.localeCompare(b.eventId)).map(event => event.eventId));
});

test('raw facts, evidence, decisions, corrections, and contributions are append-only', async () => {
  await assert.rejects(ActivityEvent.updateOne({ eventId: fixture.events[0].eventId }, { $set: { actorId: 'rewritten' } }), /append-only/);
  await assert.rejects(Evidence.deleteOne({ evidenceId: fixture.evidence[0].evidenceId }), /append-only/);
  assert.equal((await ActivityEvent.findOne({ eventId: fixture.events[0].eventId }).lean()).actorId, fixture.events[0].actorId);
});

test('canonical identity collisions fail closed', async () => {
  const event = fixture.events[0];
  await assert.rejects(service.appendEvent({ ...event, occurredAt: '2026-08-27T00:00:00.000Z' }), /CANONICAL_IDENTITY_COLLISION/);
});

test('qualification and contribution results persist separately from raw facts', async () => {
  const decisions = qualifyLedger(fixture.events, policy.qualification, { evidenceByRef: fixture.evidenceByRef });
  await service.appendDecision(decisions[0]);
  await service.appendContribution(fixture.events[0], decisions[0]);
  assert.equal(await Decision.countDocuments({ eventId: fixture.events[0].eventId }), 1);
  const result = await Contribution.findOne({ eventId: fixture.events[0].eventId }).lean();
  assert.equal(result.personal, decisions[0].contributionResult.personal);
  assert.equal(result.factionId, 'Neon');
  assert.equal((await ActivityEvent.findOne({ eventId: fixture.events[0].eventId }).lean()).canonicalPayload.qualification, undefined);
});

test('deterministic replay stores separate personal/faction checkpoints and preserves Unaffiliated behavior', async () => {
  const expectedDecisions = qualifyLedger(fixture.events, policy.qualification, { evidenceByRef: fixture.evidenceByRef });
  const expected = project(fixture.events, expectedDecisions, policy, { evidenceByRef: fixture.evidenceByRef });
  const first = await service.rebuildProjection({ policy, rebuiltAt: new Date('2026-09-04T00:00:00.000Z') });
  const second = await service.rebuildProjection({ policy, rebuiltAt: new Date('2026-09-04T00:00:00.000Z') });
  const userReplay = await service.rebuildUserProjection({ userId: 'unaffiliated_power', policy, rebuiltAt: new Date('2026-09-04T00:00:00.000Z') });
  assert.deepEqual(first, expected);
  assert.deepEqual(second, first);
  assert.deepEqual(userReplay.personal, first.personal.unaffiliated_power);
  assert.equal(userReplay.projectionContext.projectionContextId, first.projectionContext.projectionContextId);
  assert.ok(first.personal.unaffiliated_power);
  assert.equal(Object.values(first.faction).some(value => value.contributors.unaffiliated_power != null), false);
  const storedPersonal = await service.getProjection('personal', 'unaffiliated_power', first.projectionContext.projectionContextId);
  assert.deepEqual(storedPersonal.projectionContext, first.projectionContext);
  assert.deepEqual(storedPersonal.checkpoint, first.personal.unaffiliated_power);
  assert.ok(await service.getProjection('faction', 'Neon', first.projectionContext.projectionContextId));
  assert.equal(await Projection.countDocuments({ scope: 'personal' }), 2);
});

test('correction relationships are explicit records and never rewrite their target', async () => {
  const target = fixture.events[0];
  const correction = canonicalEvent({
    idempotencyKey: 'release-3b:correction:1', eventType: 'correction.moderation_reversal', activityClass: target.activityClass,
    actorId: 'moderation-service', beneficiaryId: target.beneficiaryId, occurredAt: '2026-09-01T00:00:00.000Z',
    object: { type: 'activity_event', id: target.eventId }, affiliations: { actor: { state: 'unknown' }, beneficiary: target.affiliations.beneficiary },
    provenance: { producer: 'moderation-service', authority: 'MODERATION' }, evidenceRefs: [fixture.evidence[0].evidenceId],
    correction: { targetEventId: target.eventId, type: 'moderation_reversal', effectiveAt: '2026-09-01T00:00:00.000Z', evidenceRefs: [fixture.evidence[0].evidenceId], sequence: 1, authorityVersion: '1' }
  });
  await service.appendEvent(correction);
  const relationship = await Correction.findOne({ correctionEventId: correction.eventId }).lean();
  assert.equal(relationship.targetEventId, target.eventId);
  assert.equal(await ActivityEvent.countDocuments({ eventId: target.eventId }), 1);
  await assert.rejects(Correction.deleteOne({ correctionEventId: correction.eventId }), /append-only/);
});

test('shadow foundation is not imported by the application server or exposed as a route', () => {
  assert.equal(service.SHADOW_MODE, true);
  assert.equal(service.USER_FACING_PROGRESSION_ENABLED, false);
  const serverSource = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  assert.equal(serverSource.includes('progression/persistence'), false);
});

test('rollback refuses to discard persisted shadow data by default', async () => {
  await assert.rejects(rollbackMigration(), /refused because collections contain data/);
});
