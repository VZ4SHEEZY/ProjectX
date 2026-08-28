'use strict';

const { SPECIALTIES, appendLogicalLedger } = require('./contracts');

const BANDS = Object.freeze([[100, 'Apex'], [76, 'Legendary'], [51, 'Elite'], [26, 'Influential'], [11, 'Established'], [1, 'Initiation']]);
const NEGATING_CORRECTIONS = new Set(['moderation_reversal', 'reversal', 'refund', 'chargeback', 'supersession', 'amendment']);

function levelFromContribution(total) {
  // Simulator-only curve. Production thresholds remain an unresolved product policy.
  return Math.min(100, Math.max(1, Math.floor(Math.sqrt(Math.max(0, total) / 8)) + 1));
}

function resolveEffectiveEventGraph(events) {
  const ledger = appendLogicalLedger(events);
  const byId = new Map(ledger.map(event => [event.eventId, event]));
  const corrections = ledger.filter(event => event.correction).sort((a, b) =>
    a.correction.targetEventId.localeCompare(b.correction.targetEventId) ||
    a.correction.sequence - b.correction.sequence ||
    a.correction.effectiveAt.localeCompare(b.correction.effectiveAt) ||
    a.eventId.localeCompare(b.eventId));
  const lastSequence = new Map();
  const inactive = new Set();
  for (const event of corrections) {
    const correction = event.correction;
    if (!byId.has(correction.targetEventId)) throw new Error(`CORRECTION_TARGET_NOT_FOUND:${correction.targetEventId}`);
    const previous = lastSequence.get(correction.targetEventId) || 0;
    if (correction.sequence <= previous) throw new Error(`CORRECTION_SEQUENCE_CONFLICT:${correction.targetEventId}:${correction.sequence}`);
    lastSequence.set(correction.targetEventId, correction.sequence);
    if (NEGATING_CORRECTIONS.has(correction.type)) inactive.add(correction.targetEventId);
    if (correction.replacementEventId && !byId.has(correction.replacementEventId)) throw new Error(`CORRECTION_REPLACEMENT_NOT_FOUND:${correction.replacementEventId}`);
  }
  return { effectiveEvents: ledger.filter(event => !event.correction && !inactive.has(event.eventId)), inactiveEventIds: [...inactive].sort(), corrections };
}

function selectDecisions(decisions, policy) {
  const selected = new Map();
  const decisionIds = new Set();
  let generation = null;
  for (const decision of decisions) {
    if (decision.policyVersion !== policy.version || decision.policyArtifactDigest !== policy.artifactDigest) throw new Error('DECISION_POLICY_MISMATCH');
    if (decisionIds.has(decision.decisionId)) throw new Error(`DUPLICATE_DECISION_ID:${decision.decisionId}`);
    decisionIds.add(decision.decisionId);
    generation ||= decision.evaluationGeneration;
    if (generation !== decision.evaluationGeneration) throw new Error('MIXED_EVALUATION_GENERATIONS');
    const composite = `${decision.eventId}:${decision.policyVersion}:${decision.evaluationGeneration}`;
    if (selected.has(composite)) throw new Error(`DUPLICATE_DECISION_IDENTITY:${composite}`);
    selected.set(composite, decision);
  }
  return { byEventId: new Map([...selected.values()].map(decision => [decision.eventId, decision])), generation };
}

function project(events, decisions, policy) {
  const { effectiveEvents, inactiveEventIds } = resolveEffectiveEventGraph(events);
  const { byEventId, generation } = selectDecisions(decisions, policy);
  const users = new Map();
  const factions = new Map();
  for (const event of effectiveEvents) {
    const decision = byEventId.get(event.eventId);
    if (!decision || decision.factor <= 0) continue;
    const contribution = policy.contribution(event, decision);
    const user = getUser(users, event.beneficiaryId);
    user.total += contribution.personal;
    for (const [specialty, value] of Object.entries(contribution.specialties || {})) user.specialties[specialty] += value;
    user.crossFactionInfluence += contribution.crossFactionInfluence || 0;
    user.reasons.push(...(contribution.publicExplanationCategories || []));

    const beneficiaryAffiliation = event.affiliations.beneficiary;
    if (beneficiaryAffiliation.state === 'affiliated' && contribution.faction > 0) {
      const factionId = beneficiaryAffiliation.factionId;
      const faction = factions.get(factionId) || { total: 0, contributors: {} };
      faction.total += contribution.faction;
      faction.contributors[event.beneficiaryId] = (faction.contributors[event.beneficiaryId] || 0) + contribution.faction;
      factions.set(factionId, faction);
    }
    // Both unknown and unaffiliated fail closed for faction contribution. Neither
    // affects legitimate personal contribution or defaults to any faction.
  }
  const personal = Object.fromEntries([...users].sort().map(([id, value]) => [id, {
    level: levelFromContribution(value.total),
    band: BANDS.find(([minimum]) => levelFromContribution(value.total) >= minimum)[1],
    contribution: round(value.total),
    specialties: Object.fromEntries(Object.entries(value.specialties).map(([key, score]) => [key, round(score)])),
    crossFactionInfluence: round(value.crossFactionInfluence),
    publicExplanationCategories: [...new Set(value.reasons)].sort()
  }]));
  const faction = Object.fromEntries([...factions].sort().map(([id, value]) => [id, { total: round(value.total), contributors: mapRound(value.contributors) }]));
  return { policyVersion: policy.version, evaluationGeneration: generation, inactiveEventIds, personal, faction };
}

function getUser(users, id) {
  if (!users.has(id)) users.set(id, { total: 0, specialties: Object.fromEntries(SPECIALTIES.map(key => [key, 0])), crossFactionInfluence: 0, reasons: [] });
  return users.get(id);
}
function round(value) { return Math.round(value * 100) / 100; }
function mapRound(value) { return Object.fromEntries(Object.entries(value).map(([key, score]) => [key, round(score)])); }

module.exports = { BANDS, levelFromContribution, resolveEffectiveEventGraph, project };
