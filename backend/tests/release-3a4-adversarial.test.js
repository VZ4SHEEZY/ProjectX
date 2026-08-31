'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { testProducerTrust, testProgression } = require('./helpers/test-producer-trust');
const fs = require('node:fs');
const path = require('node:path');
const Ajv2020 = require('ajv/dist/2020');
const { canonicalEvent } = require('../progression/contracts');
const { canonicalEvidence } = require('../progression/evidence');
const { correctionAuthorizationContract } = require('../progression/authority');
const { canonicalPolicyArtifact } = require('../progression/policy-artifact');
const { loadPolicy } = require('../progression/policy-runtime');
const { qualifyLedger } = require('../progression/qualification');
const { project, resolveEffectiveEventGraph } = testProgression.projection;
const policy = require('../progression/policies/simulation-v1');

function event() { return canonicalEvent({ idempotencyKey: '3a4-event', eventType: 'creation.published', activityClass: 'CREATE', actorId: 'creator', beneficiaryId: 'creator', occurredAt: '2026-08-28T00:00:00.000Z' }); }

test('verified policy artifact exclusively selects qualification and contribution implementations', () => {
  const item = event();
  const baseline = qualifyLedger([item], policy.qualification);
  const injected = qualifyLedger([item], { artifact: policy.artifact, evaluate: () => ({ state: 'rejected', factor: 0, reasonCodes: ['ATTACK'] }) });
  assert.deepEqual(injected, baseline);
  assert.deepEqual(project([item], baseline, { artifact: policy.artifact, contribution: () => ({ personal: 1e12 }) }), project([item], baseline, policy));
  const changedCode = { ...policy.artifact, code: `${policy.artifact.code}\nattack` };
  assert.throws(() => loadPolicy(changedCode), /codeDigest/);
  const { artifactDigest, configDigest, ...withoutClaims } = policy.artifact;
  const changedConfig = canonicalPolicyArtifact({ ...withoutClaims, config: { ...policy.artifact.config, profile: 'changed' } });
  assert.notEqual(changedConfig.artifactDigest, policy.artifactDigest);
  assert.equal(loadPolicy(changedConfig).artifact.config.profile, 'changed');
  assert.deepEqual(qualifyLedger([item], loadPolicy(policy.artifact)), baseline);
});

test('projection entry closes and identity-binds every permitted qualification decision field', () => {
  const item = event(); const decision = qualifyLedger([item], policy.qualification)[0];
  const attacks = [
    { contributionResult: { ...decision.contributionResult, personal: decision.contributionResult.personal + 1 } },
    { state: 'rejected' }, { factor: 0.5 }, { projectionContextId: `sha256:${'0'.repeat(64)}` },
    { evidenceSetDigest: `sha256:${'1'.repeat(64)}` }, { policyArtifactDigest: `sha256:${'2'.repeat(64)}` },
    { reasonCodes: ['ALTERED'] }, { signals: { ...decision.signals, valueSignal: 0.123 } }
  ];
  for (const mutation of attacks) assert.throws(() => project([item], [{ ...decision, ...mutation }], policy), /QUALIFICATION_DECISION_INVALID|DECISION_/);
  const { contributionResult, ...missing } = decision;
  assert.throws(() => project([item], [missing], policy), /QUALIFICATION_DECISION_INVALID/);
  assert.throws(() => project([item], [{ ...decision, debugMessage: 'unbound' }], policy), /QUALIFICATION_DECISION_INVALID/);
  assert.throws(() => project([item], [{ ...decision, factor: '1' }], policy), /QUALIFICATION_DECISION_INVALID/);
  assert.throws(() => project([item], [{ ...decision, reasonCodes: ['x'.repeat(129)] }], policy), /QUALIFICATION_DECISION_INVALID/);
  assert.doesNotThrow(() => project([item], [decision], policy));
});

test('authenticated producer contexts are private-boundary-issued, non-forgeable, and domain-bound', () => {
  const trust = testProducerTrust([{ principalId: 'payments', producer: 'payment-service', domains: ['correction'] }, { principalId: 'social', producer: 'social-service', domains: ['social'] }]);
  const { registry } = trust;
  const context = trust.authenticatedContext('payments', 'correction');
  assert.equal(registry.assertContext(context, 'correction').producer, 'payment-service');
  assert.throws(() => registry.assertContext({ ...context }, 'correction'), /CONTEXT_REQUIRED/);
  assert.throws(() => trust.authenticateUntrusted({ authenticated: true, principalId: 'payments' }, 'correction'), /CONTEXT_REQUIRED/);
  assert.throws(() => trust.authenticateUntrusted({ principalId: 'payments' }, 'correction'), /CONTEXT_REQUIRED/);
  assert.throws(() => trust.authenticatedContext('social', 'correction'), /DOMAIN_UNAUTHORIZED/);
  assert.throws(() => trust.authenticatedContext('unknown', 'correction'), /CONTEXT_REQUIRED/);
});

test('correction production path rejects registry bypass, payload identity, and wrong-domain identity', () => {
  const bundle = correctionBundle();
  const forgedRegistry = { assertContext: () => ({ principalId: 'attacker', producer: bundle.correction.provenance.producer, domain: 'correction' }) };
  assert.throws(() => resolveEffectiveEventGraph(bundle.events, { ...bundle.options, producerRegistry: forgedRegistry, authenticatedProducerContext: { producer: bundle.correction.provenance.producer } }), /TRUSTED_PRODUCER_REGISTRY_REQUIRED/);
  assert.throws(() => resolveEffectiveEventGraph(bundle.events, { ...bundle.options, authenticatedProducerContext: { principalId: 'payments', producer: 'payment-service', domain: 'correction' } }), /AUTHENTICATED_PRODUCER_CONTEXT_REQUIRED/);
  const socialContext = bundle.trust.authenticatedContext('social', 'social');
  assert.throws(() => resolveEffectiveEventGraph(bundle.events, { ...bundle.options, authenticatedProducerContext: socialContext }), /PRODUCER_DOMAIN_UNAUTHORIZED/);
  const forgedAuthorization = { authorize: () => ({ precedence: 999, authorityClass: 'ECONOMIC' }) };
  assert.throws(() => resolveEffectiveEventGraph(bundle.events, { ...bundle.options, authorization: forgedAuthorization }), /TRUSTED_CORRECTION_AUTHORIZATION_REQUIRED/);
});

test('complete correction path rejects producer mismatch and non-canonical sequence starts/gaps', () => {
  const mismatch = correctionBundle({ correctionProducer: 'attacker-service' });
  assert.throws(() => resolveEffectiveEventGraph(mismatch.events, mismatch.options), /CORRECTION_PRODUCER_ASSERTION_MISMATCH/);
  const initialGap = correctionBundle({ sequence: 2 });
  assert.throws(() => resolveEffectiveEventGraph(initialGap.events, initialGap.options), /CORRECTION_SEQUENCE_MUST_START_AT_ONE/);
  const first = correctionBundle({ sequence: 1 });
  const thirdCorrection = correctionEvent(first.target, first.evidence, 3, 'payment-service', 'compensation-3');
  assert.throws(() => resolveEffectiveEventGraph([...first.events, thirdCorrection], first.options), /CORRECTION_SEQUENCE_NON_MONOTONIC/);
});

test('complete compensation path binds amount, currency, beneficiary, and transaction relationship', () => {
  for (const mutation of [
    { amountMinor: '2501' }, { currency: 'EUR' }, { beneficiaryId: 'attacker' },
    { recipientId: 'attacker' }, { transactionRef: 'wrong-transaction' }, { compensatingTransactionRef: 'wrong-relationship' }
  ]) {
    const bundle = correctionBundle({ evidenceMutation: mutation });
    assert.throws(() => resolveEffectiveEventGraph(bundle.events, bundle.options), /COMPENSATION_|CORRECTION_EVIDENCE_SEMANTICS_INVALID/);
  }
});

test('policy schema is structural while sensitive-key rejection is an explicit semantic stage', () => {
  const schema = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../docs/release-3a/policy-artifact.schema.json'), 'utf8'));
  const validate = new Ajv2020({ strict: true }).compile(schema);
  const { artifactDigest, configDigest, ...base } = policy.artifact;
  const structurallyValid = { ...policy.artifact, config: { authenticationSecret: 'raw' } };
  assert.equal(validate(structurallyValid), true);
  assert.throws(() => canonicalPolicyArtifact({ ...base, config: structurallyValid.config }), /forbidden/);
});

function correctionBundle({ sequence = 1, correctionProducer = 'payment-service', evidenceMutation = {} } = {}) {
  const target = canonicalEvent({ idempotencyKey: '3a4-original', eventType: 'economy.support.final', activityClass: 'TRANSACT', actorId: 'supporter', beneficiaryId: 'creator', occurredAt: '2026-08-28T00:00:00.000Z', object: { type: 'transaction', id: 'tx-original' }, economic: { amountMinor: '2500', currency: 'USD', state: 'finalized', finalityEvidenceRef: 'a'.repeat(32) } });
  const replacement = canonicalEvent({ idempotencyKey: '3a4-compensation', eventType: 'economy.support.final', activityClass: 'TRANSACT', actorId: 'supporter', beneficiaryId: 'creator', occurredAt: '2026-08-28T00:01:00.000Z', object: { type: 'transaction', id: 'tx-compensation' }, economic: { amountMinor: '2500', currency: 'USD', state: 'reversed' } });
  const body = { state: 'reversed', authorityRef: 'payment-service', transactionRef: target.object.id, compensatingTransactionRef: replacement.object.id, amountMinor: '2500', currency: 'USD', payerId: target.actorId, beneficiaryId: target.beneficiaryId, recipientId: target.actorId, direction: 'beneficiary_to_payer', amountSign: 'non_negative_magnitude', ...evidenceMutation };
  const evidence = canonicalEvidence({ type: 'economic_finality', contractVersion: '1.0.0', subject: { type: 'activity_event', id: target.eventId }, producer: 'payment-service', generation: '1', observedAt: '2026-08-28T00:02:00.000Z', confidence: 1, lineage: ['payment-authority'], privacyClassification: 'restricted', retentionClass: 'audit', body });
  const correction = correctionEvent(target, evidence, sequence, correctionProducer, `compensation-${sequence}`);
  const trust = testProducerTrust([{ principalId: 'payments', producer: 'payment-service', domains: ['correction'] }, { principalId: 'social', producer: 'social-service', domains: ['social'] }]);
  const { registry } = trust;
  const authorization = correctionAuthorizationContract([{ producer: 'payment-service', authorityClass: 'ECONOMIC', correctionTypes: ['compensation'], eventTypePatterns: ['economy.*'], evidenceProducers: ['payment-service'], evidenceContractVersions: { economic_finality: '1.0.0' }, version: '1' }]);
  const options = { producerRegistry: registry, authenticatedProducerContext: trust.authenticatedContext('payments', 'correction'), authorization, evidenceByRef: { [evidence.evidenceId]: evidence } };
  return { target, replacement, evidence, correction, registry, trust, authorization, events: [target, replacement, correction], options };
}

function correctionEvent(target, evidence, sequence, producer, suffix) {
  return canonicalEvent({ idempotencyKey: `3a4:${suffix}`, eventType: 'correction.compensation', activityClass: 'TRANSACT', actorId: producer, beneficiaryId: target.beneficiaryId, occurredAt: '2026-08-28T00:03:00.000Z', object: { type: 'activity_event', id: target.eventId }, provenance: { producer, authority: 'ECONOMIC' }, correction: { targetEventId: target.eventId, type: 'compensation', effectiveAt: '2026-08-28T00:03:00.000Z', evidenceRefs: [evidence.evidenceId], sequence, authorityVersion: '1', compensatingEventId: canonicalEvent({ idempotencyKey: '3a4-compensation', eventType: 'economy.support.final', activityClass: 'TRANSACT', actorId: 'supporter', beneficiaryId: 'creator', occurredAt: '2026-08-28T00:01:00.000Z', object: { type: 'transaction', id: 'tx-compensation' }, economic: { amountMinor: '2500', currency: 'USD', state: 'reversed' } }).eventId }, evidenceRefs: [evidence.evidenceId] });
}
