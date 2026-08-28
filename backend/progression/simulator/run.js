'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { qualifyLedger } = require('../qualification');
const { project } = require('../projection');
const policyV1 = require('../policies/simulation-v1');
const policyV2 = require('../policies/simulation-v2');
const { PERSONAS } = require('./personas');
const { buildScenario } = require('./scenarios');

function simulate(policy = policyV1) {
  const events = buildScenario();
  const decisions = qualifyLedger(events, policy.qualification);
  const projections = project(events, decisions, policy);
  return { generatedAt: '2026-08-28T00:00:00.000Z', syntheticOnly: true, policyVersion: policy.version, eventCount: events.length, events, decisions, projections };
}

function report(result) {
  const decisionByUser = new Map();
  for (const event of result.events) {
    const bucket = decisionByUser.get(event.beneficiaryId) || { qualified: 0, diminished: 0, rejected: 0, quarantined: 0, reasons: [] };
    const decision = result.decisions.find(item => item.eventId === event.eventId);
    bucket[decision.state] = (bucket[decision.state] || 0) + 1;
    bucket.reasons.push(...decision.reasonCodes);
    decisionByUser.set(event.beneficiaryId, bucket);
  }
  const lines = [
    '# Release 3A deterministic simulation report', '',
    `Policy: \`${result.policyVersion}\``, '',
    `Synthetic immutable events: ${result.eventCount}. No database or production user was read or mutated.`, '',
    '| Persona | Level | Personal | Faction | Cross-faction | Decisions | Why |',
    '|---|---:|---:|---:|---:|---|---|'
  ];
  for (const persona of PERSONAS) {
    const p = result.projections.personal[persona.id] || { level: 1, contribution: 0, crossFactionInfluence: 0, reasonCodes: [] };
    const factionName = persona.id === 'unaffiliated_power' ? null : (['cross_faction_viral', 'viral_creator', 'original_creator', 'many_supporters', 'huge_supporter', 'ai_builder'].includes(persona.id) ? 'Neon' : 'Chrome');
    const factionValue = factionName ? result.projections.faction[factionName]?.contributors[persona.id] || 0 : 0;
    const d = decisionByUser.get(persona.id) || {};
    const counts = ['qualified', 'diminished', 'rejected', 'quarantined'].filter(key => d[key]).map(key => `${key}:${d[key]}`).join(', ') || 'none';
    const why = [...new Set([...(d.reasons || []), ...(p.reasonCodes || [])])].sort().join(', ');
    lines.push(`| ${persona.label} | ${p.level} | ${p.contribution} | ${factionValue} | ${p.crossFactionInfluence} | ${counts} | ${why} |`);
  }
  lines.push('', '## Interpretation', '',
    '- Scores and thresholds are simulator diagnostics, not a production formula or promised balance.',
    '- Qualification reason codes explain outcomes without revealing private allegiance inputs or a future scoring formula.',
    '- High-volume legitimate activity can diminish through neutral repeat caps without being labeled abuse.',
    '- Unaffiliated activity receives personal progression and no faction projection.',
    '- Policy V2 exists only to verify that the same raw ledger can be replayed into new projections.');
  return `${lines.join('\n')}\n`;
}

if (require.main === module) {
  const policy = process.argv.includes('--policy=v2') ? policyV2 : policyV1;
  const result = simulate(policy);
  const markdown = report(result);
  const outputArg = process.argv.find(arg => arg.startsWith('--output='));
  if (outputArg) fs.writeFileSync(path.resolve(outputArg.slice('--output='.length)), markdown);
  process.stdout.write(markdown);
}

module.exports = { simulate, report };
