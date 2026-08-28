'use strict';

const { SPECIALTIES } = require('./contracts');

const BANDS = Object.freeze([
  [100, 'Apex'], [76, 'Legendary'], [51, 'Elite'], [26, 'Influential'], [11, 'Established'], [1, 'Initiation']
]);

function levelFromContribution(total) {
  // Simulator-only curve. Production thresholds remain an unresolved product policy.
  return Math.min(100, Math.max(1, Math.floor(Math.sqrt(Math.max(0, total) / 8)) + 1));
}

function project(events, decisions, policy) {
  const decisionById = new Map(decisions.map(item => [item.eventId, item]));
  const users = new Map();
  const factions = new Map();
  for (const event of events) {
    const decision = decisionById.get(event.eventId);
    if (!decision || decision.factor <= 0) continue;
    const contribution = policy.contribution(event, decision);
    const user = getUser(users, event.beneficiaryId);
    user.total += contribution.personal;
    for (const [specialty, value] of Object.entries(contribution.specialties || {})) user.specialties[specialty] += value;
    user.crossFactionInfluence += contribution.crossFactionInfluence || 0;
    user.reasons.push(...decision.reasonCodes, ...(contribution.reasonCodes || []));

    // Unaffiliated has no faction projection. Personal contribution is intentionally unaffected.
    if (event.factionAtEvent && contribution.faction > 0) {
      const faction = factions.get(event.factionAtEvent) || { total: 0, contributors: {} };
      faction.total += contribution.faction;
      faction.contributors[event.beneficiaryId] = (faction.contributors[event.beneficiaryId] || 0) + contribution.faction;
      factions.set(event.factionAtEvent, faction);
    }
  }
  const personal = Object.fromEntries([...users].sort().map(([id, value]) => [id, {
    level: levelFromContribution(value.total),
    band: BANDS.find(([minimum]) => levelFromContribution(value.total) >= minimum)[1],
    contribution: round(value.total),
    specialties: Object.fromEntries(Object.entries(value.specialties).map(([key, score]) => [key, round(score)])),
    crossFactionInfluence: round(value.crossFactionInfluence),
    reasonCodes: [...new Set(value.reasons)].sort()
  }]));
  const faction = Object.fromEntries([...factions].sort().map(([id, value]) => [id, { total: round(value.total), contributors: mapRound(value.contributors) }]));
  return { policyVersion: policy.version, personal, faction };
}

function getUser(users, id) {
  if (!users.has(id)) users.set(id, { total: 0, specialties: Object.fromEntries(SPECIALTIES.map(key => [key, 0])), crossFactionInfluence: 0, reasons: [] });
  return users.get(id);
}
function round(value) { return Math.round(value * 100) / 100; }
function mapRound(value) { return Object.fromEntries(Object.entries(value).map(([key, score]) => [key, round(score)])); }

module.exports = { BANDS, levelFromContribution, project };
