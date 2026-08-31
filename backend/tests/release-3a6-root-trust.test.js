'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { testProducerTrust } = require('./helpers/test-producer-trust');
const { canonicalEvent } = require('../progression/contracts');
const { canonicalEvidence } = require('../progression/evidence');
const { correctionAuthorizationContract } = require('../progression/authority');
const { resolveEffectiveEventGraph } = require('../progression/projection');

const backendRoot = path.resolve(__dirname, '..');

test('exact 3A.5 production-module exploit has no root issuer to invoke', () => {
  const probe = `
    const assert = require('node:assert/strict');
    const internal = require('./progression/producer-internal');
    const publicApi = require('./progression/producer');
    assert.deepEqual(Object.keys(internal), ['assertProducerRegistry']);
    assert.equal(internal.createProducerTrustBoundary, undefined);
    assert.equal(publicApi.createProducerTrustBoundary, undefined);
    assert.throws(() => internal.assertProducerRegistry({ assertContext() {} }), /TRUSTED_PRODUCER_REGISTRY_REQUIRED/);
  `;
  assert.doesNotThrow(() => execFileSync(process.execPath, ['-e', probe], { cwd: backendRoot, stdio: 'pipe' }));
});

test('direct production paths expose no configurable issuer or authentication hook', () => {
  const probe = `
    const assert = require('node:assert/strict');
    for (const name of ['./progression/producer-internal', './progression/producer', './progression/projection']) {
      const api = require(name);
      for (const forbidden of ['createProducerTrustBoundary', 'authenticatePrincipal', 'authenticatedContext', 'authenticate', 'producerRegistry', 'registerPrincipal']) {
        assert.equal(api[forbidden], undefined, name + ':' + forbidden);
      }
    }
  `;
  assert.doesNotThrow(() => execFileSync(process.execPath, ['-e', probe], { cwd: backendRoot, stdio: 'pipe' }));
});

test('production progression source has no alternate caller-configurable authority factory', () => {
  const files = fs.readdirSync(path.join(backendRoot, 'progression'), { recursive: true })
    .filter(name => name.endsWith('.js'));
  for (const name of files) {
    const source = fs.readFileSync(path.join(backendRoot, 'progression', name), 'utf8');
    assert.equal(/module\.exports\s*=\s*\{[^}]*createProducerTrustBoundary/s.test(source), false, name);
    assert.equal(/exports\.createProducerTrustBoundary/.test(source), false, name);
  }
});

test('forged registries, callbacks, mappings, and context forms fail on the correction path', () => {
  const bundle = correctionBundle();
  const forgedRegistry = { assertContext: context => context };
  const forgedContexts = [
    undefined,
    { authenticated: true, principalId: 'payments' },
    { principalId: 'payments' },
    { principalId: 'payments', producer: 'payment-service', domain: 'correction' },
    { producer: 'payment-service', domain: 'correction', authenticatePrincipal: credentials => credentials.principalId },
    JSON.parse(JSON.stringify(bundle.context)),
    { ...bundle.context }
  ];
  assert.throws(() => resolveEffectiveEventGraph(bundle.events, { ...bundle.options, producerRegistry: forgedRegistry }), /TRUSTED_PRODUCER_REGISTRY_REQUIRED/);
  for (const context of forgedContexts) {
    assert.throws(() => resolveEffectiveEventGraph(bundle.events, { ...bundle.options, authenticatedProducerContext: context }), /CORRECTION_AUTHENTICATED_PRODUCER_REQUIRED|AUTHENTICATED_PRODUCER_CONTEXT_REQUIRED/);
  }
  assert.throws(() => bundle.trust.authenticateUntrusted({ principalId: 'payments' }, 'correction'), /AUTHENTICATED_PRODUCER_CONTEXT_REQUIRED/);
});

test('test-only payments authority succeeds while domain and producer escalation fail', () => {
  const bundle = correctionBundle();
  assert.doesNotThrow(() => resolveEffectiveEventGraph(bundle.events, bundle.options));
  const socialContext = bundle.trust.authenticatedContext('social', 'social');
  assert.throws(() => resolveEffectiveEventGraph(bundle.events, { ...bundle.options, authenticatedProducerContext: socialContext }), /PRODUCER_DOMAIN_UNAUTHORIZED/);
  assert.throws(() => bundle.trust.authenticatedContext('social', 'correction'), /PRODUCER_DOMAIN_UNAUTHORIZED/);
  const mismatch = correctionBundle('social-service');
  assert.throws(() => resolveEffectiveEventGraph(mismatch.events, mismatch.options), /CORRECTION_PRODUCER_ASSERTION_MISMATCH/);
});

function correctionBundle(correctionProducer = 'payment-service') {
  const target = canonicalEvent({ idempotencyKey: '3a6-target', eventType: 'economy.support.final', activityClass: 'TRANSACT', actorId: 'payer', beneficiaryId: 'creator', occurredAt: '2026-08-29T00:00:00.000Z', object: { type: 'transaction', id: 'tx-3a6' }, economic: { amountMinor: '100', currency: 'USD', state: 'finalized', finalityEvidenceRef: 'a'.repeat(32) } });
  const evidence = canonicalEvidence({ type: 'economic_finality', contractVersion: '1.0.0', subject: { type: 'activity_event', id: target.eventId }, producer: 'payment-service', generation: '1', observedAt: '2026-08-29T00:01:00.000Z', confidence: 1, lineage: ['payment-authority'], privacyClassification: 'restricted', retentionClass: 'audit', body: { state: 'chargeback', authorityRef: 'payment-service', transactionRef: target.object.id, amountMinor: '100', currency: 'USD', payerId: target.actorId, beneficiaryId: target.beneficiaryId } });
  const correction = canonicalEvent({ idempotencyKey: `3a6-correction:${correctionProducer}`, eventType: 'correction.chargeback', activityClass: 'TRANSACT', actorId: correctionProducer, beneficiaryId: target.beneficiaryId, occurredAt: '2026-08-29T00:02:00.000Z', object: { type: 'activity_event', id: target.eventId }, provenance: { producer: correctionProducer, authority: 'ECONOMIC' }, correction: { targetEventId: target.eventId, type: 'chargeback', effectiveAt: '2026-08-29T00:02:00.000Z', evidenceRefs: [evidence.evidenceId], sequence: 1, authorityVersion: '1' }, evidenceRefs: [evidence.evidenceId] });
  const trust = testProducerTrust([{ principalId: 'payments', producer: 'payment-service', domains: ['correction'] }, { principalId: 'social', producer: 'social-service', domains: ['social'] }]);
  const context = trust.authenticatedContext('payments', 'correction');
  const authorization = correctionAuthorizationContract([{ producer: 'payment-service', authorityClass: 'ECONOMIC', correctionTypes: ['chargeback'], eventTypePatterns: ['economy.*'], evidenceProducers: ['payment-service'], evidenceContractVersions: { economic_finality: '1.0.0' }, version: '1' }]);
  return { trust, context, events: [target, correction], options: { producerRegistry: trust.registry, authenticatedProducerContext: context, authorization, evidenceByRef: { [evidence.evidenceId]: evidence } } };
}
