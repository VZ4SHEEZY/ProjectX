'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { canonicalEvent, appendLogicalLedger } = require('../progression/contracts');
const { qualifyLedger } = require('../progression/qualification');
const { project } = require('../progression/projection');
const policyV1 = require('../progression/policies/simulation-v1');
const policyV2 = require('../progression/policies/simulation-v2');
const { buildScenario, buildScenarioBundle } = require('../progression/simulator/scenarios');
const { canonicalEvidence, assertNonOverlappingReach } = require('../progression/evidence');
const { canonicalPolicyArtifact } = require('../progression/policy-artifact');
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
  const first = qualifyLedger([event], policyV1.qualification, { evaluationGeneration: 'generation-a', evidenceByRef })[0];
  const second = qualifyLedger([event], policyV1.qualification, { evaluationGeneration: 'generation-b', evidenceByRef })[0];
  assert.notEqual(first.decisionId, second.decisionId);
  assert.equal(first.policyArtifactDigest, policyV1.artifactDigest);
  assert.ok(Array.isArray(first.evidenceRefs));
});

test('later moderation reversal removes the original contribution without mutating it', () => {
  const original = testEvent({ key: 'moderated-original', type: 'creation.published', activityClass: 'CREATE' });
  const before = project([original], qualifyLedger([original], policyV1.qualification), policyV1);
  const reversal = correctionEvent(original, 'moderation_reversal', 1);
  const ledger = [original, reversal];
  const serialized = JSON.stringify(original);
  const after = project(ledger, qualifyLedger(ledger, policyV1.qualification), policyV1);
  assert.ok(before.personal.beneficiary.contribution > 0);
  assert.equal(after.personal.beneficiary, undefined);
  assert.deepEqual(after.inactiveEventIds, [original.eventId]);
  assert.equal(JSON.stringify(original), serialized);
});

test('economic reversal, refund, and chargeback compensate finalized contribution deterministically', () => {
  for (const type of ['reversal', 'refund', 'chargeback']) {
    const original = testEvent({ key: `tip-final:${type}`, type: 'economy.support.final', activityClass: 'TRANSACT', economic: { amountMinor: '2500', currency: 'USD', state: 'finalized', finalityEvidenceRef: 'evidence:finality' } });
    const correction = correctionEvent(original, type, 1);
    const ledger = [correction, original];
    const first = project(ledger, qualifyLedger(ledger, policyV1.qualification), policyV1);
    const second = project([...ledger].reverse(), qualifyLedger([...ledger].reverse(), policyV1.qualification), policyV1);
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
  const d1 = qualifyLedger([first], policyV1.qualification, { evaluationGeneration: 'a' })[0];
  const d2 = qualifyLedger([second], policyV1.qualification, { evaluationGeneration: 'b' })[0];
  assert.throws(() => project([first, second], [d1, d2], policyV1), /MIXED_EVALUATION_GENERATIONS/);
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
  const p1 = project(events, d1, policyV1);
  const p2 = project(events, d2, policyV2);
  assert.equal(JSON.stringify(events), serialized);
  assert.notDeepEqual(d1, d2);
  assert.notDeepEqual(p1, p2);
});

test('raw events reject producer-controlled policy and hidden allegiance inputs', () => {
  assert.throws(() => testEvent({ key: 'bad-attributes', extra: { attributes: { hiddenAllegianceWeight: 1.2 } } }), /attributes/);
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
  assert.throws(() => assertNonOverlappingReach([make('2026-08-01T00:00:00.000Z', '2026-08-01T01:00:00.000Z', 'a'), make('2026-08-01T00:30:00.000Z', '2026-08-01T02:00:00.000Z', 'b')]), /OVERLAPPING_REACH_WINDOWS/);
  assert.throws(() => canonicalEvidence({ ...make('2026-08-02T00:00:00.000Z', '2026-08-02T01:00:00.000Z', 'c'), body: { ...make('2026-08-02T00:00:00.000Z', '2026-08-02T01:00:00.000Z', 'c').body, arbitraryProducerClaim: true } }), /unsupported evidence field/);
});

test('policy artifacts freeze every replay-relevant compatibility input', () => {
  const artifact = canonicalPolicyArtifact({ policyId: 'sim', version: '1', codeDigest: 'sha256:code', configDigest: 'sha256:config', detectorVersions: { trust: '1' }, evidenceContractVersions: { reach: '1.0.0' }, taxonomyVersion: '1', numericRules: { integer: 'decimal-string' }, roundingRules: { contribution: 'half-away-zero-2dp' }, runtimeCompatibility: { node: '22' }, serialization: 'RFC8785-compatible-stable-json-v1' });
  assert.match(artifact.artifactDigest, /^sha256:[a-f0-9]{64}$/);
  assert.equal(Object.isFrozen(artifact), true);
  assert.throws(() => canonicalPolicyArtifact({ policyId: 'incomplete' }), /requires version/);
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

function correctionEvent(target, type, sequence) {
  return canonicalEvent({
    idempotencyKey: `${target.eventId}:${type}:${sequence}`,
    eventType: `correction.${type}`,
    activityClass: target.activityClass,
    actorId: 'correction-authority',
    beneficiaryId: target.beneficiaryId,
    occurredAt: '2026-08-02T00:00:00.000Z',
    object: { type: 'activity_event', id: target.eventId },
    affiliations: { actor: { state: 'unknown' }, beneficiary: target.affiliations.beneficiary },
    correction: { targetEventId: target.eventId, type, authority: 'moderation:test', effectiveAt: '2026-08-02T00:00:00.000Z', evidenceRefs: [`evidence:${type}`], sequence },
    evidenceRefs: [`evidence:${type}`]
  });
}
