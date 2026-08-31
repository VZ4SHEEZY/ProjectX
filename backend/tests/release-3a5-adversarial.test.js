'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { testProducerTrust } = require('./helpers/test-producer-trust');
const { canonicalEvent } = require('../progression/contracts');
const { canonicalEvidence } = require('../progression/evidence');
const { correctionAuthorizationContract } = require('../progression/authority');
const producerApi = require('../progression/producer');
const { resolveEffectiveEventGraph } = require('../progression/projection');

test('production producer API consumes trust but cannot issue trusted contexts', () => {
  assert.deepEqual(Object.keys(producerApi).sort(), ['assertProducerRegistry', 'ingestEvent', 'ingestEvidence']);
  assert.equal(producerApi.producerRegistry, undefined);
  assert.equal(producerApi.producerTrustBoundary, undefined);
  assert.equal(producerApi.authenticatedContext, undefined);
});

test('actual correction path rejects every caller-minted or reconstructed identity', () => {
  const bundle = compensationBundle();
  const attempts = [
    undefined,
    { authenticated: true, principalId: 'payments' },
    { principalId: 'payments' },
    { principalId: 'payments', producer: 'payment-service', domain: 'correction' },
    JSON.parse(JSON.stringify(bundle.options.authenticatedProducerContext)),
    { ...bundle.options.authenticatedProducerContext }
  ];
  for (const authenticatedProducerContext of attempts) {
    assert.throws(() => resolveEffectiveEventGraph(bundle.events, { ...bundle.options, authenticatedProducerContext }), /CORRECTION_AUTHENTICATED_PRODUCER_REQUIRED|AUTHENTICATED_PRODUCER_CONTEXT_REQUIRED/);
  }
  assert.doesNotThrow(() => resolveEffectiveEventGraph(bundle.events, bundle.options));
});

test('actual correction path gives payload provenance no authority and enforces producer domain', () => {
  const bundle = compensationBundle();
  const socialContext = bundle.trust.authenticatedContext('social', 'social');
  assert.throws(() => resolveEffectiveEventGraph(bundle.events, { ...bundle.options, authenticatedProducerContext: socialContext }), /PRODUCER_DOMAIN_UNAUTHORIZED/);
  assert.throws(() => bundle.trust.authenticatedContext('social', 'correction'), /PRODUCER_DOMAIN_UNAUTHORIZED/);
  assert.throws(() => bundle.trust.authenticatedContext('unknown', 'correction'), /AUTHENTICATED_PRODUCER_CONTEXT_REQUIRED/);
  assert.throws(() => resolveEffectiveEventGraph(bundle.events, { ...bundle.options, authenticatedProducerContext: undefined }), /CORRECTION_AUTHENTICATED_PRODUCER_REQUIRED/);

  const forged = compensationBundle({ correctionProducer: 'social-service' });
  assert.throws(() => resolveEffectiveEventGraph(forged.events, forged.options), /CORRECTION_PRODUCER_ASSERTION_MISMATCH/);
});

test('compensation evidence state allowlist fails closed through the correction path', () => {
  for (const state of ['pending', 'failed', 'refund', 'finalized', 'chargeback', 'chain_reorganization']) {
    const bundle = compensationBundle({ evidenceMutation: { state } });
    assert.throws(() => resolveEffectiveEventGraph(bundle.events, bundle.options), /CORRECTION_EVIDENCE_SEMANTICS_INVALID|COMPENSATION_SEMANTICS_INVALID/);
  }
  const canonical = compensationBundle();
  assert.doesNotThrow(() => resolveEffectiveEventGraph(canonical.events, canonical.options));
});

test('compensation event finality allowlist rejects noncanonical and unrelated final payments', () => {
  for (const state of ['pending', 'failed', 'refund', 'finalized']) {
    const bundle = compensationBundle({ replacementMutation: { economic: { state } } });
    assert.throws(() => resolveEffectiveEventGraph(bundle.events, bundle.options), /COMPENSATION_EVENT_INVALID/);
  }
});

test('compensation semantics mutate one bound property at a time and fail closed', () => {
  const evidenceMutations = [
    { amountMinor: '2501' },
    { currency: 'EUR' },
    { direction: 'payer_to_beneficiary' },
    { payerId: 'other-payer' },
    { beneficiaryId: 'other-beneficiary' },
    { recipientId: 'other-recipient' },
    { transactionRef: 'tx-unrelated' },
    { compensatingTransactionRef: 'tx-unrelated-compensation' }
  ];
  for (const evidenceMutation of evidenceMutations) {
    const bundle = compensationBundle({ evidenceMutation });
    assert.throws(() => resolveEffectiveEventGraph(bundle.events, bundle.options), /CORRECTION_EVIDENCE_SEMANTICS_INVALID|COMPENSATION_SEMANTICS_INVALID|COMPENSATION_EVENT_INVALID/);
  }

  const missingSign = compensationBundle({ omitEvidenceField: 'amountSign' });
  assert.throws(() => resolveEffectiveEventGraph(missingSign.events, missingSign.options), /COMPENSATION_SEMANTICS_INVALID/);

  const replacementMutations = [
    { economic: { amountMinor: '2501' } },
    { economic: { currency: 'EUR' } },
    { actorId: 'other-payer' },
    { beneficiaryId: 'other-beneficiary' },
    { object: { type: 'unrelated_transaction' } }
  ];
  for (const replacementMutation of replacementMutations) {
    const bundle = compensationBundle({ replacementMutation });
    assert.throws(() => resolveEffectiveEventGraph(bundle.events, bundle.options), /COMPENSATION_EVENT_INVALID/);
  }
});

function compensationBundle({ evidenceMutation = {}, replacementMutation = {}, omitEvidenceField, correctionProducer = 'payment-service' } = {}) {
  const target = canonicalEvent({ idempotencyKey: '3a5-original', eventType: 'economy.support.final', activityClass: 'TRANSACT', actorId: 'supporter', beneficiaryId: 'creator', occurredAt: '2026-08-28T00:00:00.000Z', object: { type: 'transaction', id: 'tx-original' }, economic: { amountMinor: '2500', currency: 'USD', state: 'finalized', finalityEvidenceRef: 'a'.repeat(32) } });
  const replacementState = replacementMutation.economic?.state || 'reversed';
  const replacement = canonicalEvent({ idempotencyKey: `3a5-compensation:${JSON.stringify(replacementMutation)}`, eventType: 'economy.support.final', activityClass: 'TRANSACT', actorId: replacementMutation.actorId || 'supporter', beneficiaryId: replacementMutation.beneficiaryId || 'creator', occurredAt: '2026-08-28T00:01:00.000Z', object: { type: replacementMutation.object?.type || 'transaction', id: replacementMutation.object?.id || 'tx-compensation' }, economic: { amountMinor: replacementMutation.economic?.amountMinor || '2500', currency: replacementMutation.economic?.currency || 'USD', state: replacementState, ...(replacementState === 'finalized' ? { finalityEvidenceRef: 'b'.repeat(32) } : {}) } });
  const body = { state: 'reversed', authorityRef: 'payment-service', transactionRef: target.object.id, compensatingTransactionRef: replacement.object.id, amountMinor: '2500', currency: 'USD', payerId: target.actorId, beneficiaryId: target.beneficiaryId, recipientId: target.actorId, direction: 'beneficiary_to_payer', amountSign: 'non_negative_magnitude', ...evidenceMutation };
  if (omitEvidenceField) delete body[omitEvidenceField];
  const evidence = canonicalEvidence({ type: 'economic_finality', contractVersion: '1.0.0', subject: { type: 'activity_event', id: target.eventId }, producer: 'payment-service', generation: '1', observedAt: '2026-08-28T00:02:00.000Z', confidence: 1, lineage: ['payment-authority'], privacyClassification: 'restricted', retentionClass: 'audit', body });
  const correction = canonicalEvent({ idempotencyKey: `3a5-correction:${evidence.evidenceId}:${correctionProducer}`, eventType: 'correction.compensation', activityClass: 'TRANSACT', actorId: correctionProducer, beneficiaryId: target.beneficiaryId, occurredAt: '2026-08-28T00:03:00.000Z', object: { type: 'activity_event', id: target.eventId }, provenance: { producer: correctionProducer, authority: 'ECONOMIC' }, correction: { targetEventId: target.eventId, type: 'compensation', effectiveAt: '2026-08-28T00:03:00.000Z', evidenceRefs: [evidence.evidenceId], sequence: 1, authorityVersion: '1', compensatingEventId: replacement.eventId }, evidenceRefs: [evidence.evidenceId] });
  const trust = testProducerTrust([{ principalId: 'payments', producer: 'payment-service', domains: ['correction'] }, { principalId: 'social', producer: 'social-service', domains: ['social'] }]);
  const authorization = correctionAuthorizationContract([{ producer: 'payment-service', authorityClass: 'ECONOMIC', correctionTypes: ['compensation'], eventTypePatterns: ['economy.*'], evidenceProducers: ['payment-service'], evidenceContractVersions: { economic_finality: '1.0.0' }, version: '1' }]);
  const options = { producerRegistry: trust.registry, authenticatedProducerContext: trust.authenticatedContext('payments', 'correction'), authorization, evidenceByRef: { [evidence.evidenceId]: evidence } };
  return { target, replacement, evidence, correction, trust, events: [target, replacement, correction], options };
}
