'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { canonicalEvent } = require('../progression/contracts');
const { qualifyLedger } = require('../progression/qualification');
const { project } = require('../progression/projection');
const policyV1 = require('../progression/policies/simulation-v1');
const policyV2 = require('../progression/policies/simulation-v2');
const { buildScenario } = require('../progression/simulator/scenarios');
const { simulate, report } = require('../progression/simulator/run');

test('canonical activity events are immutable and require ledger fields', () => {
  const event = canonicalEvent({ idempotencyKey: 'immutable:1', eventType: 'creation.published', activityClass: 'CREATE', actorId: 'a', occurredAt: '2026-08-01T00:00:00Z' });
  assert.equal(Object.isFrozen(event), true);
  assert.equal(Object.isFrozen(event.qualification), true);
  assert.throws(() => canonicalEvent({}), /idempotencyKey/);
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
  assert.ok(personal.spam_poster.reasonCodes.includes('SUSPICIOUS_VELOCITY'));
});

test('cross-faction viral reach beats a coordinated same-faction ring in faction value', () => {
  const { faction } = simulate().projections;
  assert.ok(faction.Neon.contributors.cross_faction_viral > faction.Chrome.contributors.same_faction_farmer * 3);
});

test('a whale cannot purchase top progression and supporter breadth matters', () => {
  const { personal } = simulate().projections;
  assert.ok(personal.economic_whale.level < 26);
  assert.ok(personal.many_supporters.contribution > personal.huge_supporter.contribution);
  assert.equal(personal.circular_tips, undefined);
});

test('Unaffiliated power user progresses normally without faction assignment', () => {
  const result = simulate();
  assert.ok(result.projections.personal.unaffiliated_power.level > result.projections.personal.casual.level);
  for (const faction of Object.values(result.projections.faction)) assert.equal(faction.contributors.unaffiliated_power, undefined);
  assert.ok(result.events.filter(event => event.beneficiaryId === 'unaffiliated_power').every(event => event.factionAtEvent === null));
});

test('high-volume legitimate activity is diminished but not classified as abuse', () => {
  const result = simulate();
  const ids = new Set(result.events.filter(event => event.beneficiaryId === 'active_legit').map(event => event.eventId));
  const decisions = result.decisions.filter(decision => ids.has(decision.eventId));
  assert.ok(decisions.some(decision => decision.state === 'diminished'));
  assert.ok(decisions.every(decision => !decision.reasonCodes.some(code => /ABUSE|SYBIL|RING|SPAM/.test(code))));
});

test('duplicate, reversal, moderation, Sybil, and circular hooks fail closed', () => {
  const result = simulate();
  const rejected = result.decisions.filter(item => item.state === 'rejected').flatMap(item => item.reasonCodes);
  assert.ok(rejected.includes('CIRCULAR_ECONOMIC_ACTIVITY'));
  assert.ok(rejected.includes('HIGH_SYBIL_CONFIDENCE'));
  const event = buildScenario()[0];
  const duplicate = qualifyLedger([event, event], policyV1.qualification);
  assert.equal(duplicate[1].reasonCodes[0], 'DUPLICATE_EVENT');
});

test('policy changes rebuild decisions and projections without rewriting raw events', () => {
  const events = buildScenario();
  const serialized = JSON.stringify(events);
  const d1 = qualifyLedger(events, policyV1.qualification);
  const d2 = qualifyLedger(events, policyV2.qualification);
  const p1 = project(events, d1, policyV1);
  const p2 = project(events, d2, policyV2);
  assert.equal(JSON.stringify(events), serialized);
  assert.notDeepEqual(d1, d2);
  assert.notDeepEqual(p1, p2);
});
