'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { canonicalEvent, appendLogicalLedger } = require('../progression/contracts');
const { qualifyLedger, qualificationDecision } = require('../progression/qualification');
const { project, resolveEffectiveEventGraph } = require('../progression/projection');
const policyV1 = require('../progression/policies/simulation-v1');
const policyV2 = require('../progression/policies/simulation-v2');
const { buildScenario, buildScenarioBundle } = require('../progression/simulator/scenarios');
const { canonicalEvidence, resolveEffectiveEvidence, assertNonOverlappingReach } = require('../progression/evidence');
const { canonicalPolicyArtifact } = require('../progression/policy-artifact');
const { correctionAuthorizationContract } = require('../progression/authority');
const { simulate, report } = require('../progression/simulator/run');

test('canonical activity events are immutable and require ledger fields', () => {
  const event = canonicalEvent({ idempotencyKey: 'immutable:1', eventType: 'creation.published', activityClass: 'CREATE', actorId: 'a', beneficiaryId: 'a', occurredAt: '2026-08-01T00:00:00.000Z' });
  assert.equal(Object.isFrozen(event), true);
  assert.equal('qualification' in event, false);
  assert.equal('policyVersion' in event, false);
  assert.equal(Object.isFrozen(event.affiliations), true);
  assert.throws(() => canonicalEvent({}), /event identity/);
});

test('replaying identical events and policy is deterministic', () => {
  const first = simulate(policyV1);
  const second = simulate(policyV1);
  assert.deepEqual(first, second);
  assert.equal(report(first), report(second));
});

test('viral creator strongly outperforms spam without tuning persona order', () => {
  const { personal } = simulate().projections;
  assert.ok(personal.viral_creator.contribution > personal.spam_poster.contribution * 3);
  assert.ok(personal.viral_creator.level > personal.spam_poster.level);
  const result = simulate();
  const spamIds = new Set(result.events.filter(event => event.beneficiaryId === 'spam_poster').map(event => event.eventId));
  assert.ok(result.decisions.some(decision => spamIds.has(decision.eventId) && decision.reasonCodes.includes('SUSPICIOUS_VELOCITY')));
});

test('cross-faction viral reach beats a coordinated same-faction ring in faction value', () => {
  const { faction } = simulate().projections;
  assert.ok(faction.Neon.contributors.cross_faction_viral > faction.Chrome.contributors.same_faction_farmer * 3);
});

test('supporter and recipient economic scenarios remain distinct without deciding production credit ownership', () => {
  const result = simulate();
  const { personal } = result.projections;
  const spenderEvent = result.events.find(event => event.actorId === 'wealthy_spender');
  assert.equal(spenderEvent.beneficiaryId, 'wealthy-spender-recipient');
  assert.equal(personal.wealthy_spender, undefined);
  assert.ok(personal['wealthy-spender-recipient'].level < 26);
  assert.ok(personal.many_supporters.contribution > personal.one_large_supporter.contribution);
  assert.equal(personal.circular_tips, undefined);
});

test('Unaffiliated power user progresses normally without faction assignment', () => {
  const result = simulate();
  assert.ok(result.projections.personal.unaffiliated_power.level > result.projections.personal.casual.level);
  for (const faction of Object.values(result.projections.faction)) assert.equal(faction.contributors.unaffiliated_power, undefined);
  assert.ok(result.events.filter(event => event.beneficiaryId === 'unaffiliated_power').every(event => event.affiliations.beneficiary.state === 'unaffiliated'));
});

test('high-volume legitimate activity is diminished but not classified as abuse', () => {
  const result = simulate();
  const ids = new Set(result.events.filter(event => event.beneficiaryId === 'active_legit').map(event => event.eventId));
  const decisions = result.decisions.filter(decision => ids.has(decision.eventId));
  assert.ok(decisions.some(decision => decision.state === 'diminished'));
  assert.ok(decisions.every(decision => !decision.reasonCodes.some(code => /ABUSE|SYBIL|RING|SPAM/.test(code))));
});

test('duplicate raw delivery is removed before qualification and identity collisions fail closed', () => {
  const result = simulate();
  const rejected = result.decisions.filter(item => item.state === 'rejected').flatMap(item => item.reasonCodes);
  assert.ok(rejected.includes('CIRCULAR_ECONOMIC_ACTIVITY'));
  assert.ok(rejected.includes('HIGH_SYBIL_CONFIDENCE'));
  const { events, evidenceByRef } = buildScenarioBundle();
  const event = events[0];
  const duplicate = qualifyLedger([event, event], policyV1.qualification, { evidenceByRef });
  assert.equal(duplicate.length, 1);
  const collision = { ...event, actorId: 'different-actor' };
  assert.throws(() => appendLogicalLedger([event, collision]), /EVENT_IDENTITY_COLLISION/);
});

test('canonical identity is producer scoped for the same domain transition', () => {
  const first = testEvent({ key: 'producer-scope', producer: 'producer-a' });
  const second = testEvent({ key: 'producer-scope', producer: 'producer-b' });
  assert.notEqual(first.eventId, second.eventId);
  assert.notEqual(first.idempotencyKey, second.idempotencyKey);
  assert.equal(appendLogicalLedger([first, second]).length, 2);
  assert.throws(() => canonicalEvent({ ...first, eventId: 'producer-chosen-id' }), /eventId must match/);
});

test('qualification decision identity includes policy and evaluation generation', () => {
  const { events, evidenceByRef } = buildScenarioBundle();
  const event = events[0];
  const first = qualifyLedger([event], policyV1.qualification, { evaluationGeneration: '1', evidenceByRef })[0];
  const second = qualifyLedger([event], policyV1.qualification, { evaluationGeneration: '2', evidenceByRef })[0];
  assert.notEqual(first.decisionId, second.decisionId);
  assert.equal(first.policyArtifactDigest, policyV1.artifactDigest);
  assert.ok(Array.isArray(first.evidenceRefs));
});

test('later moderation reversal removes the original contribution without mutating it', () => {
  const original = testEvent({ key: 'moderated-original', type: 'creation.published', activityClass: 'CREATE' });
  const before = project([original], qualifyLedger([original], policyV1.qualification), policyV1);
  const evidence = correctionEvidence(original, 'moderation', 'moderation-service');
  const reversal = correctionEvent(original, 'moderation_reversal', 1, evidence);
  const ledger = [original, reversal];
  const serialized = JSON.stringify(original);
  const options = correctionOptions([evidence]);
  const after = project(ledger, qualifyLedger(ledger, policyV1.qualification, options), policyV1, options);
  assert.ok(before.personal.beneficiary.contribution > 0);
  assert.equal(after.personal.beneficiary, undefined);
  assert.deepEqual(after.inactiveEventIds, [original.eventId]);
  assert.equal(JSON.stringify(original), serialized);
});

test('economic reversal, refund, and chargeback compensate finalized contribution deterministically', () => {
  for (const type of ['reversal', 'refund', 'chargeback']) {
    const seed = testEvent({ key: `tip-final:${type}`, type: 'economy.support.final', activityClass: 'TRANSACT' });
    const finality = canonicalEvidence({ type: 'economic_finality', contractVersion: '1.0.0', producer: 'payment-service', generation: '1', subject: seed.object, observedAt: '2026-08-01T00:00:00.000Z', confidence: 1, lineage: ['restricted-authority-reference'], privacyClassification: 'restricted', retentionClass: 'audit', body: { state: 'finalized', authorityRef: 'payment-service', transactionRef: seed.object.id } });
    const original = testEvent({ key: `tip-final:${type}`, type: 'economy.support.final', activityClass: 'TRANSACT', economic: { amountMinor: '2500', currency: 'USD', state: 'finalized', finalityEvidenceRef: finality.evidenceId }, extra: { evidenceRefs: [finality.evidenceId] } });
    const evidence = correctionEvidence(original, 'economic_finality', 'payment-service', type === 'reversal' ? 'reversed' : type);
    const correction = correctionEvent(original, type, 1, evidence, 'payment-service', 'ECONOMIC');
    const ledger = [correction, original];
    const options = correctionOptions([finality, evidence]);
    const first = project(ledger, qualifyLedger(ledger, policyV1.qualification, options), policyV1, options);
    const second = project([...ledger].reverse(), qualifyLedger([...ledger].reverse(), policyV1.qualification, options), policyV1, options);
    assert.equal(first.personal.beneficiary, undefined);
    assert.deepEqual(first, second);
  }
});

test('faction snapshots preserve event-time beneficiary state and unknown fails closed', () => {
  const affiliated = testEvent({ key: 'affiliated', beneficiaryAffiliation: affiliation('Neon') });
  const unknown = testEvent({ key: 'unknown', beneficiaryAffiliation: { state: 'unknown' } });
  const unaffiliated = testEvent({ key: 'unaffiliated', beneficiaryAffiliation: { state: 'unaffiliated', effectiveAt: '2026-08-01T00:00:00.000Z', source: 'test' } });
  const events = [affiliated, unknown, unaffiliated];
  const result = project(events, qualifyLedger(events, policyV1.qualification), policyV1);
  assert.ok(result.personal.beneficiary.contribution > 0);
  assert.ok(result.faction.Neon.contributors.beneficiary > 0);
  assert.equal(Object.keys(result.faction).length, 1);
  assert.equal(affiliated.affiliations.beneficiary.factionId, 'Neon');
});

test('actor and beneficiary faction snapshots are independent and later switches do not rewrite history', () => {
  const first = testEvent({ key: 'snapshot-before', actorAffiliation: affiliation('Chrome'), beneficiaryAffiliation: affiliation('Neon') });
  const switched = testEvent({ key: 'snapshot-after', actorAffiliation: affiliation('Neon'), beneficiaryAffiliation: affiliation('Chrome') });
  const before = JSON.stringify(first);
  const result = project([switched, first], qualifyLedger([switched, first], policyV1.qualification), policyV1);
  assert.equal(first.affiliations.actor.factionId, 'Chrome');
  assert.equal(first.affiliations.beneficiary.factionId, 'Neon');
  assert.equal(JSON.stringify(first), before);
  assert.ok(result.faction.Neon.contributors.beneficiary > 0);
  assert.ok(result.faction.Chrome.contributors.beneficiary > 0);
});

test('mixed evaluation generations fail closed', () => {
  const first = testEvent({ key: 'mixed-a' });
  const second = testEvent({ key: 'mixed-b' });
  const d1 = qualifyLedger([first], policyV1.qualification, { evaluationGeneration: '1' })[0];
  const d2 = qualifyLedger([second], policyV1.qualification, { evaluationGeneration: '2' })[0];
  assert.throws(() => project([first, second], [d1, d2], policyV1), /DECISION_PROJECTION_CONTEXT_MISMATCH|MIXED_EVALUATION_GENERATIONS/);
});

test('delayed ingestion, cutoff, and deterministic producer tie ordering are replayable', () => {
  const late = testEvent({ key: 'late', occurredAt: '2026-08-01T00:00:00.000Z', ingestedAt: '2026-08-03T00:00:00.000Z', producer: 'producer-b' });
  const timely = testEvent({ key: 'timely', occurredAt: '2026-08-01T00:00:00.000Z', ingestedAt: '2026-08-01T01:00:00.000Z', producer: 'producer-a' });
  const all = qualifyLedger([late, timely], policyV1.qualification);
  const reversed = qualifyLedger([timely, late], policyV1.qualification);
  assert.deepEqual(all, reversed);
  assert.deepEqual(all.map(item => item.eventId), [timely.eventId, late.eventId]);
  const cutoff = qualifyLedger([late, timely], policyV1.qualification, { ledgerCutoff: '2026-08-02T00:00:00.000Z' });
  assert.deepEqual(cutoff.map(item => item.eventId), [timely.eventId]);
});

test('policy changes rebuild decisions and projections without rewriting raw events', () => {
  const { events, evidenceByRef } = buildScenarioBundle();
  const serialized = JSON.stringify(events);
  const d1 = qualifyLedger(events, policyV1.qualification, { evidenceByRef });
  const d2 = qualifyLedger(events, policyV2.qualification, { evidenceByRef });
  const p1 = project(events, d1, policyV1, { evidenceByRef });
  const p2 = project(events, d2, policyV2, { evidenceByRef });
  assert.equal(JSON.stringify(events), serialized);
  assert.notDeepEqual(d1, d2);
  assert.notDeepEqual(p1, p2);
});

test('raw events reject producer-controlled policy and hidden allegiance inputs', () => {
  assert.throws(() => testEvent({ key: 'bad-attributes', extra: { attributes: { hiddenAllegianceWeight: 1.2 } } }), /unsupported properties/);
  assert.throws(() => canonicalEvent({ idempotencyKey: 'implicit-beneficiary', eventType: 'creation.published', activityClass: 'CREATE', actorId: 'actor', occurredAt: '2026-08-01T00:00:00.000Z' }), /beneficiaryId/);
});

test('internal qualification reasons are redacted from public projections', () => {
  const result = simulate();
  assert.ok(result.decisions.some(decision => decision.reasonCodes.includes('HIGH_SYBIL_CONFIDENCE')));
  assert.equal(JSON.stringify(result.projections).includes('HIGH_SYBIL_CONFIDENCE'), false);
  assert.equal(JSON.stringify(result.projections).includes('SUSPICIOUS_VELOCITY'), false);
});

test('typed reach evidence rejects overlapping additive windows', () => {
  const make = (start, end, generation) => canonicalEvidence({ type: 'reach', contractVersion: '1.0.0', producer: 'test', generation, subject: { type: 'post', id: 'p1' }, observedAt: end, confidence: 1, lineage: ['test'], privacyClassification: 'internal', retentionClass: 'test', body: { windowStart: start, windowEnd: end, deduplicationMethod: 'test-v1', audienceAggregate: 'count-only', uniquePeople: 2, uniqueFactions: 1, sameFaction: 1, crossFaction: 1, unaffiliated: 0, unknownOrIneligible: 0, sourceChannel: 'test' } });
  assert.throws(() => assertNonOverlappingReach([make('2026-08-01T00:00:00.000Z', '2026-08-01T01:00:00.000Z', '1'), make('2026-08-01T00:30:00.000Z', '2026-08-01T02:00:00.000Z', '2')]), /OVERLAPPING_REACH_WINDOWS/);
  assert.throws(() => canonicalEvidence({ ...make('2026-08-02T00:00:00.000Z', '2026-08-02T01:00:00.000Z', '3'), body: { ...make('2026-08-02T00:00:00.000Z', '2026-08-02T01:00:00.000Z', '3').body, arbitraryProducerClaim: true } }), /unsupported evidence field/);
});

test('policy artifacts freeze every replay-relevant compatibility input', () => {
  const artifact = canonicalPolicyArtifact({ policyId: 'sim', version: '1', code: 'return true;', config: { mode: 'test' }, detectorVersions: { trust: '1' }, evidenceContractVersions: { reach: '1.0.0' }, evidenceEligibility: { test: { permittedTypes: ['reach'] } }, taxonomyVersion: '1', numericRules: { integer: 'decimal-string' }, roundingRules: { contribution: 'half-away-zero-2dp' }, runtimeCompatibility: { node: '22' }, serialization: 'RFC8785-compatible-stable-json-v1' });
  assert.match(artifact.artifactDigest, /^sha256:[a-f0-9]{64}$/);
  assert.equal(Object.isFrozen(artifact), true);
  assert.throws(() => canonicalPolicyArtifact({ policyId: 'incomplete' }), /version/);
});

test('fake correction authority and invalid correction evidence fail closed', () => {
  const target = testEvent({ key: 'authority-target' });
  const evidence = correctionEvidence(target, 'moderation', 'moderation-service');
  const fake = correctionEvent(target, 'moderation_reversal', 1, evidence, 'attacker', 'self-asserted');
  assert.throws(() => resolveEffectiveEventGraph([target, fake], correctionOptions([evidence])), /CORRECTION_PRODUCER_UNAUTHORIZED/);
  const valid = correctionEvent(target, 'moderation_reversal', 1, evidence);
  assert.throws(() => resolveEffectiveEventGraph([target, valid], correctionOptions([])), /CORRECTION_EVIDENCE_NOT_FOUND/);
  const wrong = correctionEvidence(target, 'economic_finality', 'moderation-service');
  const wrongRef = correctionEvent(target, 'moderation_reversal', 1, wrong);
  assert.throws(() => resolveEffectiveEventGraph([target, wrongRef], correctionOptions([wrong])), /CORRECTION_EVIDENCE_AUTHORITY_MISMATCH/);
  const wrongTargetEvidence = correctionEvidence(target, 'moderation', 'moderation-service', 'reversed', { body: { ...evidence.body, targetEventId: 'f'.repeat(32) } });
  const wrongTarget = correctionEvent(target, 'moderation_reversal', 1, wrongTargetEvidence);
  assert.throws(() => resolveEffectiveEventGraph([target, wrongTarget], correctionOptions([wrongTargetEvidence])), /CORRECTION_EVIDENCE_SEMANTICS_INVALID/);
  const wrongObjectEvidence = correctionEvidence(target, 'moderation', 'moderation-service', 'reversed', { body: { ...evidence.body, targetObject: { type: 'test', id: 'other-object' } } });
  const wrongObject = correctionEvent(target, 'moderation_reversal', 1, wrongObjectEvidence);
  assert.throws(() => resolveEffectiveEventGraph([target, wrongObject], correctionOptions([wrongObjectEvidence])), /CORRECTION_EVIDENCE_SEMANTICS_INVALID/);
  const spoofedAuthority = correctionEvidence(target, 'moderation', 'moderation-service', 'reversed', { body: { ...evidence.body, authorityRef: 'different-authority' } });
  const spoofedAuthorityCorrection = correctionEvent(target, 'moderation_reversal', 1, spoofedAuthority);
  assert.throws(() => resolveEffectiveEventGraph([target, spoofedAuthorityCorrection], correctionOptions([spoofedAuthority])), /CORRECTION_EVIDENCE_AUTHORITY_REFERENCE_MISMATCH/);
  const wrongGeneration = correctionEvidence(target, 'moderation', 'moderation-service', 'reversed', { generation: '2' });
  const wrongGenerationCorrection = correctionEvent(target, 'moderation_reversal', 1, wrongGeneration);
  assert.throws(() => resolveEffectiveEventGraph([target, wrongGenerationCorrection], correctionOptions([wrongGeneration])), /CORRECTION_EVIDENCE_GENERATION_MISMATCH/);
});

test('future-effective corrections obey pinned cutoff and replay deterministically', () => {
  const target = testEvent({ key: 'future-effective', occurredAt: '2026-08-01T00:00:00.000Z' });
  const evidence = correctionEvidence(target, 'moderation', 'moderation-service', 'reversed', { observedAt: '2026-08-02T00:00:00.000Z' });
  const correction = correctionEvent(target, 'moderation_reversal', 1, evidence, 'moderation-service', 'MODERATION', { effectiveAt: '2026-08-05T00:00:00.000Z' });
  const early = { ...correctionOptions([evidence]), cutoff: '2026-08-04T00:00:00.000Z', watermark: '2026-08-06T00:00:00.000Z' };
  const late = { ...early, cutoff: '2026-08-06T00:00:00.000Z' };
  assert.deepEqual(resolveEffectiveEventGraph([correction, target], early).inactiveEventIds, []);
  assert.deepEqual(resolveEffectiveEventGraph([correction, target], late).inactiveEventIds, [target.eventId]);
  assert.deepEqual(resolveEffectiveEventGraph([target, correction], late), resolveEffectiveEventGraph([correction, target], late));
});

test('correction graph rejects self-correction, correction-on-correction, duplicate and non-monotonic sequences', () => {
  const target = testEvent({ key: 'graph-target' }); const evidence = correctionEvidence(target, 'moderation', 'moderation-service');
  const first = correctionEvent(target, 'moderation_reversal', 1, evidence);
  const abusiveEvidence = correctionEvidence(first, 'moderation', 'moderation-service');
  const abusive = correctionEvent(first, 'moderation_reversal', 1, abusiveEvidence);
  assert.throws(() => resolveEffectiveEventGraph([target, first, abusive], correctionOptions([evidence, abusiveEvidence])), /CORRECTION_ON_CORRECTION_UNAUTHORIZED/);
  const duplicate = correctionEvent(target, 'moderation_reversal', 1, evidence, 'moderation-service', 'MODERATION', { effectiveAt: '2026-08-03T00:00:00.000Z' });
  assert.throws(() => resolveEffectiveEventGraph([target, first, duplicate], correctionOptions([evidence])), /EVENT_IDENTITY_COLLISION|CORRECTION_SEQUENCE_CONFLICT/);
  const third = correctionEvent(target, 'moderation_reversal', 3, evidence);
  assert.throws(() => resolveEffectiveEventGraph([target, first, third], correctionOptions([evidence])), /CORRECTION_SEQUENCE_NON_MONOTONIC/);
  assert.throws(() => appendLogicalLedger([{ ...target, correction: { targetEventId: target.eventId, type: 'moderation_reversal', effectiveAt: '2026-08-02T00:00:00.000Z', evidenceRefs: [evidence.evidenceId], sequence: 1, authorityVersion: '1' } }]), /cannot target itself/);
});

test('amendment and compensation relationships are fully validated', () => {
  const target = testEvent({ key: 'replacement-target' });
  const replacement = testEvent({ key: 'replacement-wrong-type', type: 'achievement.reached', activityClass: 'ACHIEVE' });
  const domainEvidence = correctionEvidence(target, 'moderation', 'domain-service', 'amended', { body: { outcome: 'amended', authorityRef: 'domain-service', caseRef: `case:${target.eventId}`, targetEventId: target.eventId, targetObject: target.object, replacementEventId: replacement.eventId, priorVersion: target.sourceIdentity.version, replacementVersion: replacement.sourceIdentity.version } });
  const amendment = correctionEvent(target, 'amendment', 1, domainEvidence, 'domain-service', 'DOMAIN', { replacementEventId: replacement.eventId });
  assert.throws(() => resolveEffectiveEventGraph([target, replacement, amendment], correctionOptions([domainEvidence])), /CORRECTION_REPLACEMENT_INVALID/);
  assert.throws(() => correctionEvent(target, 'compensation', 1, domainEvidence, 'payment-service', 'ECONOMIC'), /requires compensatingEventId/);
});

test('canonical evidence identity, binding, supersession, and fraud schema fail closed', () => {
  const target = testEvent({ key: 'evidence-contract' });
  const base = correctionEvidence(target, 'moderation', 'moderation-service', 'open', { generation: '1' });
  assert.throws(() => canonicalEvidence({ ...base, evidenceId: '0'.repeat(32) }), /canonical evidence identity/);
  assert.throws(() => canonicalEvidence({ ...base, evidenceDigest: `sha256:${'0'.repeat(64)}` }), /digest mismatch/);
  const replacement = correctionEvidence(target, 'moderation', 'moderation-service', 'closed', { generation: '2', observedAt: '2026-08-03T00:00:00.000Z', supersedesEvidenceId: base.evidenceId });
  const effective = resolveEffectiveEvidence([replacement, base], { cutoff: '2026-08-04T00:00:00.000Z' });
  assert.deepEqual(effective.evidence.map(item => item.evidenceId), [replacement.evidenceId]);
  const backwards = correctionEvidence(target, 'moderation', 'moderation-service', 'closed', { generation: '1', observedAt: '2026-08-03T00:00:00.000Z', supersedesEvidenceId: base.evidenceId });
  assert.throws(() => resolveEffectiveEvidence([base, backwards]), /SUPERSESSION_ORDER_INVALID/);
  assert.throws(() => canonicalEvidence({ type: 'fraud_trust', contractVersion: '1.0.0', producer: 'detector', generation: '1', subject: target.object, observedAt: target.occurredAt, confidence: 1, lineage: ['detector'], privacyClassification: 'restricted', retentionClass: 'audit', body: { detectorVersion: '1', signals: { hiddenAllegiance: true } } }), /unsupported evidence field/);
});

test('decision identity binds evidence and artifact and rejects invalid evaluatedAt', () => {
  const base = { eventId: 'a'.repeat(32), policyId: 'policy', policyVersion: '1', evaluationGeneration: '1', evidenceGeneration: '1', correctionGraphGeneration: '1', cutoff: '2026-08-04T00:00:00.000Z', watermark: '2026-08-04T00:00:00.000Z', evaluatedAt: '2026-08-04T00:00:00.000Z', policyArtifactDigest: `sha256:${'1'.repeat(64)}`, evidenceSetDigest: `sha256:${'2'.repeat(64)}`, correctionGraphDigest: `sha256:${'3'.repeat(64)}`, projectionContextId: `sha256:${'4'.repeat(64)}`, state: 'qualified', factor: 1, evidenceRefs: [] };
  const first = qualificationDecision(base);
  assert.notEqual(first.decisionId, qualificationDecision({ ...base, evidenceSetDigest: `sha256:${'3'.repeat(64)}` }).decisionId);
  assert.notEqual(first.decisionId, qualificationDecision({ ...base, policyArtifactDigest: `sha256:${'4'.repeat(64)}` }).decisionId);
  assert.throws(() => qualificationDecision({ ...base, evaluatedAt: 'tomorrow' }), /evaluatedAt/);
});

test('public explanation allowlist rejects malicious policy output', () => {
  const event = testEvent({ key: 'public-output' }); const decisions = qualifyLedger([event], policyV1.qualification);
  const malicious = { ...policyV1, contribution: () => ({ personal: 1, specialties: {}, faction: 0, publicExplanationCategories: ['HIGH_SYBIL_CONFIDENCE', 'wallet:secret'] }) };
  assert.throws(() => project([event], decisions, malicious), /PUBLIC_EXPLANATION_NOT_ALLOWED/);
});

function affiliation(factionId) {
  return { state: 'affiliated', factionId, membershipRef: `membership:${factionId}`, effectiveAt: '2026-08-01T00:00:00.000Z', source: 'test' };
}

function testEvent({ key, type = 'creation.published', activityClass = 'CREATE', economic = null, actorAffiliation = affiliation('Chrome'), beneficiaryAffiliation = affiliation('Chrome'), beneficiaryId = 'beneficiary', occurredAt = '2026-08-01T00:00:00.000Z', ingestedAt, producer = 'release-3a-simulator', extra = {} }) {
  return canonicalEvent({
    idempotencyKey: key,
    eventType: type,
    activityClass,
    actorId: type.startsWith('economy.') ? 'supporter' : 'beneficiary',
    beneficiaryId,
    occurredAt,
    ingestedAt,
    provenance: { producer, authority: 'synthetic-fixture' },
    object: { type: 'test', id: key },
    affiliations: { actor: actorAffiliation, beneficiary: beneficiaryAffiliation },
    economic,
    facts: {},
    ...extra
  });
}

function correctionEvent(target, type, sequence, evidence, producer = 'moderation-service', authority = 'MODERATION', extra = {}) {
  return canonicalEvent({
    idempotencyKey: `${target.eventId}:${type}:${sequence}`,
    eventType: `correction.${type}`,
    activityClass: target.activityClass,
    actorId: producer,
    beneficiaryId: target.beneficiaryId,
    occurredAt: '2026-08-02T00:00:00.000Z',
    object: { type: 'activity_event', id: target.eventId },
    affiliations: { actor: { state: 'unknown' }, beneficiary: target.affiliations.beneficiary },
    provenance: { producer, authority },
    correction: { targetEventId: target.eventId, type, effectiveAt: '2026-08-02T00:00:00.000Z', evidenceRefs: [evidence.evidenceId], sequence, authorityVersion: '1', ...extra },
    evidenceRefs: [evidence.evidenceId]
  });
}

function correctionEvidence(target, type, producer, state = 'reversed', extra = {}) {
  const body = type === 'moderation'
    ? { outcome: state, authorityRef: producer, caseRef: `case:${target.eventId}`, targetEventId: target.eventId, targetObject: target.object || target.subject }
    : { state, authorityRef: producer, transactionRef: target.object.id };
  return canonicalEvidence({ type, contractVersion: '1.0.0', producer, generation: extra.generation || '1', subject: { type: 'activity_event', id: target.eventId }, observedAt: extra.observedAt || '2026-08-02T00:00:00.000Z', confidence: 1, lineage: ['restricted-authority-reference'], privacyClassification: 'restricted', retentionClass: 'audit', body, ...extra });
}

function correctionOptions(evidence) {
  return { authenticatedProducer: event => event.provenance.producer, evidenceByRef: Object.fromEntries(evidence.map(item => [item.evidenceId, item])), evidenceProducers: { reach: ['release-3a-simulator'], fraud_trust: ['release-3a-simulator'], moderation: ['moderation-service', 'domain-service'], economic_finality: ['payment-service'] }, authorization: correctionAuthorizationContract([
    { producer: 'moderation-service', authorityClass: 'MODERATION', correctionTypes: ['moderation_reversal'], eventTypePatterns: ['*'], evidenceProducers: ['moderation-service'], evidenceContractVersions: { moderation: '1.0.0' }, version: '1' },
    { producer: 'payment-service', authorityClass: 'ECONOMIC', correctionTypes: ['reversal', 'refund', 'chargeback', 'chain_reorganization', 'compensation'], eventTypePatterns: ['economy.*'], evidenceProducers: ['payment-service'], evidenceContractVersions: { economic_finality: '1.0.0' }, version: '1' },
    { producer: 'domain-service', authorityClass: 'DOMAIN', correctionTypes: ['amendment', 'supersession'], eventTypePatterns: ['creation.*'], evidenceProducers: ['domain-service'], evidenceContractVersions: { moderation: '1.0.0' }, version: '1' }
  ]) };
}
