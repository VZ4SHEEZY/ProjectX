'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Ajv2020 = require('ajv/dist/2020');
const addFormats = require('ajv-formats');
const { canonicalEvent } = require('../progression/contracts');
const { canonicalEvidence, resolveEffectiveEvidence } = require('../progression/evidence');
const { canonicalGeneration, compareGenerations } = require('../progression/generation');
const { canonicalPolicyArtifact } = require('../progression/policy-artifact');
const { producerRegistry, ingestEvidence } = require('../progression/producer');
const { qualifyLedger } = require('../progression/qualification');
const { project } = require('../progression/projection');
const policy = require('../progression/policies/simulation-v1');

function evidence(overrides = {}) {
  return canonicalEvidence({ type: 'moderation', contractVersion: '1.0.0', subject: { type: 'activity_event', id: 'a'.repeat(32) }, producer: 'moderation-service', generation: '1', observedAt: '2026-08-01T00:00:00.000Z', confidence: 1, lineage: ['case:a'], supersedesEvidenceId: null, privacyClassification: 'restricted', retentionClass: 'audit', body: { outcome: 'reversed', authorityRef: 'moderation-service', caseRef: `case:${'a'.repeat(32)}`, targetEventId: 'a'.repeat(32), targetObject: { type: 'content', id: 'post:a' } }, ...overrides });
}

test('complete evidence envelope is identity-bound and collisions fail closed', () => {
  const base = evidence();
  const mutations = [
    { observedAt: '2026-08-01T00:00:01.000Z' }, { confidence: .9 }, { lineage: ['case:b'] },
    { supersedesEvidenceId: 'b'.repeat(32) }, { privacyClassification: 'highly_restricted' }, { retentionClass: 'legal_hold' },
    { body: { ...base.body, outcome: 'removed' } }, { subject: { type: 'activity_event', id: 'b'.repeat(32) } },
    { producer: 'other-service' }, { generation: '2' }, { contractVersion: '1.0.1' }
  ];
  for (const mutation of mutations) {
    const changed = evidence(mutation);
    assert.notEqual(changed.evidenceId, base.evidenceId);
    assert.throws(() => canonicalEvidence({ ...changed, evidenceId: base.evidenceId }), /canonical evidence identity/);
  }
  const forged = { ...base, observedAt: '2026-08-01T00:00:01.000Z' };
  assert.throws(() => resolveEffectiveEvidence([base, forged]), /canonical evidence identity|digest mismatch/);
});

test('canonical generations sort numerically and reject ambiguous legacy strings', () => {
  assert.deepEqual(['11', '2', '10', '1', '9'].sort(compareGenerations), ['1', '2', '9', '10', '11']);
  for (const invalid of ['0', '01', '0001', 'fixture-1', '1.0', '-1', '', 1]) assert.throws(() => canonicalGeneration(invalid), /canonical|at least/);
});

test('policy bytes and canonical config are verified rather than trusting digest claims', () => {
  const base = { policyId: 'test', version: '1', code: 'byte-a', config: { threshold: 1 }, detectorVersions: {}, evidenceContractVersions: {}, evidenceEligibility: {}, taxonomyVersion: '1', numericRules: {}, roundingRules: {}, runtimeCompatibility: {}, serialization: 'RFC8785-compatible-stable-json-v1' };
  const artifact = canonicalPolicyArtifact(base);
  assert.throws(() => canonicalPolicyArtifact({ ...base, codeDigest: `sha256:${'0'.repeat(64)}` }), /codeDigest/);
  assert.throws(() => canonicalPolicyArtifact({ ...base, configDigest: `sha256:${'0'.repeat(64)}` }), /configDigest/);
  assert.notEqual(artifact.artifactDigest, canonicalPolicyArtifact({ ...base, code: 'byte-b' }).artifactDigest);
  assert.notEqual(artifact.artifactDigest, canonicalPolicyArtifact({ ...base, config: { threshold: 2 } }).artifactDigest);
  assert.throws(() => canonicalPolicyArtifact({ ...base, config: { authenticationSecret: 'do-not-store' } }), /forbidden/);
  assert.throws(() => canonicalPolicyArtifact({ ...base, config: { note: 'x'.repeat(1025) } }), /string exceeds/);
});

test('authenticated producer assertions cannot be spoofed or cross domains', () => {
  const registry = producerRegistry([{ principalId: 'payments-worker', producer: 'payment-service', domains: ['economic_finality'] }]);
  const payload = { ...evidence(), evidenceId: undefined, evidenceDigest: undefined, producer: 'moderation-service' };
  assert.throws(() => ingestEvidence(payload, { authenticated: true, principalId: 'payments-worker' }, registry, 'economic_finality'), /UNTRUSTED_PRODUCER_CLAIM_MISMATCH/);
  assert.throws(() => ingestEvidence({ ...payload, producer: 'payment-service' }, { authenticated: true, principalId: 'payments-worker' }, registry, 'moderation'), /PRODUCER_DOMAIN_UNAUTHORIZED/);
  assert.throws(() => ingestEvidence({ ...payload, producer: 'payment-service' }, { principalId: 'payments-worker' }, registry, 'economic_finality'), /AUTHENTICATED_PRODUCER_CONTEXT_REQUIRED/);
});

test('unknown event types cannot consume arbitrary evidence', () => {
  const item = canonicalEvidence({ type: 'fraud_trust', contractVersion: '1.0.0', subject: { type: 'test', id: 'unknown' }, producer: 'release-3a-simulator', generation: '1', observedAt: '2026-08-01T00:00:00.000Z', confidence: 1, lineage: ['fixture'], privacyClassification: 'restricted', retentionClass: 'synthetic', body: { detectorVersion: '1', signals: {} } });
  const event = canonicalEvent({ idempotencyKey: 'unknown', eventType: 'unknown.progression', activityClass: 'CREATE', actorId: 'a', beneficiaryId: 'a', occurredAt: '2026-08-01T00:00:00.000Z', object: item.subject, evidenceRefs: [item.evidenceId] });
  assert.throws(() => qualifyLedger([event], policy.qualification, { evidenceByRef: { [item.evidenceId]: item } }), /EVENT_EVIDENCE_POLICY_NOT_FOUND/);
});

test('projection rejects every cross-context decision reuse dimension', () => {
  const event = canonicalEvent({ idempotencyKey: 'context', eventType: 'creation.published', activityClass: 'CREATE', actorId: 'a', beneficiaryId: 'a', occurredAt: '2026-08-01T00:00:00.000Z' });
  const base = { ledgerCutoff: '2026-08-31T00:00:00.000Z', watermark: '2026-08-31T00:00:00.000Z', evaluationGeneration: '1', evidenceGeneration: '1', correctionGraphGeneration: '1' };
  const decisions = qualifyLedger([event], policy.qualification, base);
  for (const mismatch of [
    { ledgerCutoff: '2026-08-15T00:00:00.000Z' }, { watermark: '2026-08-30T00:00:00.000Z' },
    { evaluationGeneration: '2' }, { evidenceGeneration: '2' }, { correctionGraphGeneration: '2' }
  ]) assert.throws(() => project([event], decisions, policy, { ...base, ...mismatch }), /DECISION_PROJECTION_CONTEXT_MISMATCH/);
});

test('projection rejects mutated decision results even when context identity is retained', () => {
  const event = canonicalEvent({ idempotencyKey: 'decision-tamper', eventType: 'creation.published', activityClass: 'CREATE', actorId: 'a', beneficiaryId: 'a', occurredAt: '2026-08-01T00:00:00.000Z' });
  const decision = qualifyLedger([event], policy.qualification)[0];
  assert.throws(() => project([event], [{ ...decision, factor: 0.5, contributionResult: { factor: 0.5 } }], policy), /DECISION_IDENTITY_INVALID/);
});

test('all Draft 2020-12 schemas compile strictly and runtime rejects representative schema-invalid values', () => {
  const ajv = new Ajv2020({ strict: true, allErrors: true, allowUnionTypes: true }); addFormats(ajv);
  const root = path.resolve(__dirname, '../../docs/release-3a');
  const schemas = ['activity-event.schema.json', 'evidence-contract.schema.json', 'policy-artifact.schema.json', 'qualification-decision.schema.json'];
  const validators = Object.fromEntries(schemas.map(name => [name, ajv.compile(JSON.parse(fs.readFileSync(path.join(root, name), 'utf8')))]));
  const event = canonicalEvent({ idempotencyKey: 'schema-valid', eventType: 'creation.published', activityClass: 'CREATE', actorId: 'a', beneficiaryId: 'a', occurredAt: '2026-08-01T00:00:00.000Z' });
  const item = evidence();
  const decision = qualifyLedger([event], policy.qualification)[0];
  assert.equal(validators['activity-event.schema.json'](event), true, JSON.stringify(validators['activity-event.schema.json'].errors));
  assert.equal(validators['evidence-contract.schema.json'](item), true, JSON.stringify(validators['evidence-contract.schema.json'].errors));
  assert.equal(validators['policy-artifact.schema.json'](policy.artifact), true, JSON.stringify(validators['policy-artifact.schema.json'].errors));
  assert.equal(validators['qualification-decision.schema.json'](decision), true, JSON.stringify(validators['qualification-decision.schema.json'].errors));
  assert.equal(validators['evidence-contract.schema.json']({ ...item, generation: '01' }), false);
  assert.throws(() => evidence({ generation: '01' }), /canonical/);
  assert.throws(() => evidence({ confidence: Number.NaN }), /confidence/);
  assert.throws(() => evidence({ producer: 'x'.repeat(257) }), /bounded/);
  assert.throws(() => evidence({ lineage: Array.from({ length: 33 }, (_, i) => `r${i}`) }), /1\.\.32/);
  assert.throws(() => canonicalEvent({ idempotencyKey: 'bounds', eventType: 'creation.published', activityClass: 'CREATE', actorId: 'x'.repeat(257), beneficiaryId: 'a', occurredAt: '2026-08-01T00:00:00.000Z' }), /bounded/);
  assert.throws(() => canonicalEvent({ idempotencyKey: 'schema-version', schemaVersion: '9.9.9', eventType: 'creation.published', activityClass: 'CREATE', actorId: 'a', beneficiaryId: 'a', occurredAt: '2026-08-01T00:00:00.000Z' }), /schemaVersion/);
});
