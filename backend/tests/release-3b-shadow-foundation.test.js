'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { canonicalEvent } = require('../progression/contracts');
const { canonicalEvidence } = require('../progression/evidence');
const { qualifyLedger } = require('../progression/qualification');
const { project } = require('../progression/projection');
const policy = require('../progression/policies/simulation-v1');
const { buildScenarioBundle } = require('../progression/simulator/scenarios');
const service = require('../progression/persistence/service');
const repository = require('../progression/persistence/repository');
const ActivityEvent = require('../models/ProgressionActivityEvent');
const Evidence = require('../models/ProgressionEvidence');
const Decision = require('../models/ProgressionQualificationDecision');
const Correction = require('../models/ProgressionCorrectionRelationship');
const Contribution = require('../models/ProgressionContributionResult');
const Projection = require('../models/ProgressionProjection');
const PolicyArtifact = require('../models/ProgressionPolicyArtifact');
const { DEFINITIONS, inspectMigration, applyMigration, rollbackMigration } = require('../migrations/004-release-3b-shadow-foundation');

let mongo;
let fixture;
let correctionFixture;

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
  // Raw facts may arrive before their evidence; relationship checks happen at finalized decision time.
  await service.appendEvent(fixture.events[0]);
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
  await service.appendPolicy(policy.artifact);
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
  const policyIdentity = { policyId: policy.artifact.policyId, version: policy.artifact.version, artifactDigest: policy.artifact.artifactDigest };
  const first = await service.rebuildProjection({ policyIdentity, rebuiltAt: new Date('2026-09-04T00:00:00.000Z') });
  const second = await service.rebuildProjection({ policyIdentity, rebuiltAt: new Date('2026-09-04T00:00:00.000Z') });
  const userReplay = await service.rebuildUserProjection({ userId: 'unaffiliated_power', policyIdentity, rebuiltAt: new Date('2026-09-04T00:00:00.000Z') });
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

test('durable replay resolves only a verified persisted policy identity', async () => {
  const identity = { policyId: policy.artifact.policyId, version: policy.artifact.version, artifactDigest: policy.artifact.artifactDigest };
  assert.ok(await PolicyArtifact.findOne({ artifactDigest: identity.artifactDigest }));
  await assert.rejects(service.rebuildProjection({ policy }), /caller-supplied replay policies are not accepted/);
  await assert.rejects(service.rebuildProjection({ policyIdentity: { ...identity, artifactDigest: `sha256:${'0'.repeat(64)}` } }), /POLICY_ARTIFACT_NOT_FOUND/);
  await assert.rejects(service.rebuildProjection({ policyIdentity: { ...identity, version: 'wrong-version' } }), /POLICY_ARTIFACT_NOT_FOUND/);
  const first = await service.rebuildProjection({ policyIdentity: identity, rebuiltAt: new Date('2026-09-04T00:00:00.000Z') });
  const second = await service.rebuildProjection({ policyIdentity: identity, rebuiltAt: new Date('2026-09-04T00:00:00.000Z') });
  assert.deepEqual(second, first);
});

test('finalized dependent records reject missing and inconsistent relationships', async () => {
  const decisions = qualifyLedger(fixture.events, policy.qualification, { evidenceByRef: fixture.evidenceByRef });
  const absentEvent = canonicalEvent({ ...fixture.events[0], sourceIdentity: { ...fixture.events[0].sourceIdentity, version: 'absent' }, eventId: undefined });
  const absentDecision = qualificationDecisionFor(decisions[0], { eventId: absentEvent.eventId });
  await assert.rejects(service.appendDecision(absentDecision), /DECISION_EVENT_NOT_FOUND/);
  const wrongPolicy = qualificationDecisionFor(decisions[1], { policyArtifactDigest: `sha256:${'0'.repeat(64)}` });
  await assert.rejects(service.appendDecision(wrongPolicy), /DECISION_POLICY_ARTIFACT_NOT_FOUND/);
  await service.appendDecision(decisions[1]);
  await assert.rejects(service.appendContribution(fixture.events[0], decisions[1]), /CONTRIBUTION_DECISION_EVENT_MISMATCH/);
});

test('correction relationships are explicit records and never rewrite their target', async () => {
  const target = fixture.events[0];
  const moderationEvidence = canonicalEvidence({
    type: 'moderation', contractVersion: '1.0.0', subject: { type: 'activity_event', id: target.eventId },
    producer: 'moderation-service', generation: '1', observedAt: '2026-09-01T00:00:00.000Z', confidence: 1,
    lineage: ['moderation-case:1'], privacyClassification: 'internal', retentionClass: 'audit',
    body: { outcome: 'reversed', authorityRef: 'moderation-service', caseRef: 'case-1', targetEventId: target.eventId }
  });
  await service.appendEvidence(moderationEvidence);
  const correction = canonicalEvent({
    idempotencyKey: 'release-3b:correction:1', eventType: 'correction.moderation_reversal', activityClass: target.activityClass,
    actorId: 'moderation-service', beneficiaryId: target.beneficiaryId, occurredAt: '2026-09-01T00:00:00.000Z',
    object: { type: 'activity_event', id: target.eventId }, affiliations: { actor: { state: 'unknown' }, beneficiary: target.affiliations.beneficiary },
    provenance: { producer: 'moderation-service', authority: 'MODERATION' }, evidenceRefs: [moderationEvidence.evidenceId],
    correction: { targetEventId: target.eventId, type: 'moderation_reversal', effectiveAt: '2026-09-01T00:00:00.000Z', evidenceRefs: [moderationEvidence.evidenceId], sequence: 1, authorityVersion: '1' }
  });
  await service.appendEvent(correction);
  correctionFixture = correction;
  const relationship = await Correction.findOne({ correctionEventId: correction.eventId }).lean();
  assert.equal(relationship.targetEventId, target.eventId);
  assert.equal(await ActivityEvent.countDocuments({ eventId: target.eventId }), 1);
  await assert.rejects(Correction.deleteOne({ correctionEventId: correction.eventId }), /append-only/);
  const invalid = canonicalEvent({ ...correction, eventId: undefined, sourceIdentity: { ...correction.sourceIdentity, version: '2' }, correction: { ...correction.correction, targetEventId: '0'.repeat(32), sequence: 2 } });
  await assert.rejects(service.appendEvent(invalid), /CORRECTION_EVENT_NOT_FOUND/);
});

test('caller sessions are reused without starting nested transactions', async () => {
  const session = await mongoose.startSession();
  const originalStartSession = mongoose.startSession;
  try {
    await session.withTransaction(async () => {
      mongoose.startSession = async () => { throw new Error('nested session started'); };
      const stored = await service.appendEvent(correctionFixture, { session, transaction: true });
      assert.equal(stored.eventId, correctionFixture.eventId);
    });
  } finally {
    mongoose.startSession = originalStartSession;
    await session.endSession();
  }
});

test('multi-record writes still create and roll back their own transaction without a caller session', async () => {
  const target = fixture.events[1];
  const evidence = canonicalEvidence({
    type: 'moderation', contractVersion: '1.0.0', subject: { type: 'activity_event', id: target.eventId },
    producer: 'moderation-service', generation: '1', observedAt: '2026-09-02T00:00:00.000Z', confidence: 1,
    lineage: ['moderation-case:2'], privacyClassification: 'internal', retentionClass: 'audit',
    body: { outcome: 'reversed', authorityRef: 'moderation-service', caseRef: 'case-2', targetEventId: target.eventId }
  });
  await service.appendEvidence(evidence);
  const correction = canonicalEvent({
    eventType: 'correction.moderation_reversal', activityClass: target.activityClass, actorId: 'moderation-service',
    beneficiaryId: target.beneficiaryId, occurredAt: '2026-09-02T00:00:00.000Z', object: { type: 'activity_event', id: target.eventId },
    affiliations: { actor: { state: 'unknown' }, beneficiary: target.affiliations.beneficiary },
    provenance: { producer: 'moderation-service', authority: 'MODERATION' }, evidenceRefs: [evidence.evidenceId],
    correction: { targetEventId: target.eventId, type: 'moderation_reversal', effectiveAt: '2026-09-02T00:00:00.000Z', evidenceRefs: [evidence.evidenceId], sequence: 1, authorityVersion: '1' }
  });
  const originalAppendRelationship = repository.appendCorrectionRelationship;
  try {
    repository.appendCorrectionRelationship = async () => { throw new Error('simulated relationship failure'); };
    await assert.rejects(service.appendEvent(correction), /simulated relationship failure/);
  } finally {
    repository.appendCorrectionRelationship = originalAppendRelationship;
  }
  assert.equal(await ActivityEvent.exists({ eventId: correction.eventId }), null);
  assert.equal(await Correction.exists({ correctionEventId: correction.eventId }), null);
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

function qualificationDecisionFor(decision, overrides) {
  const { decisionId, ...material } = decision;
  return { ...material, ...overrides };
}
