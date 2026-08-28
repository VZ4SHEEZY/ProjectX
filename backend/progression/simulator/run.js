'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { qualifyLedger } = require('../qualification');
const { project } = require('../projection');
const policyV1 = require('../policies/simulation-v1');
const policyV2 = require('../policies/simulation-v2');
const { PERSONAS } = require('./personas');
const { buildScenarioBundle } = require('./scenarios');

function simulate(policy = policyV1) {
  const { events, evidenceByRef } = buildScenarioBundle();
  const decisions = qualifyLedger(events, policy.qualification, { evidenceByRef });
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
    '# Release 3A.1 deterministic simulation report', '',
    `Policy: \`${result.policyVersion}\``, '',
    `Synthetic immutable events: ${result.eventCount}. No database or production user was read or mutated.`, '',
    '| Persona | Level | Personal | Faction | Cross-faction | Decisions | Why |',
    '|---|---:|---:|---:|---:|---|---|'
  ];
  for (const persona of PERSONAS) {
    const p = result.projections.personal[persona.id] || { level: 1, contribution: 0, crossFactionInfluence: 0, reasonCodes: [] };
    const factionNames = [...new Set(result.events.filter(event => event.beneficiaryId === persona.id && event.affiliations.beneficiary.state === 'affiliated').map(event => event.affiliations.beneficiary.factionId))];
    const factionName = factionNames.length === 1 ? factionNames[0] : null;
    const factionValue = factionName ? result.projections.faction[factionName]?.contributors[persona.id] || 0 : 0;
    const d = decisionByUser.get(persona.id) || {};
    const counts = ['qualified', 'diminished', 'rejected', 'quarantined'].filter(key => d[key]).map(key => `${key}:${d[key]}`).join(', ') || 'none';
    const why = [...new Set([...(d.reasons || []), ...(p.reasonCodes || [])])].sort().join(', ');
    lines.push(`| ${persona.label} | ${p.level} | ${p.contribution} | ${factionValue} | ${p.crossFactionInfluence} | ${counts} | ${why} |`);
  }
  lines.push('', '## Interpretation', '',
    '- SIMULATION ONLY / NOT PRODUCTION: scores, named bands, and thresholds are diagnostics, not a finalized mathematical curve or promised balance.',
    '- Economic rows currently display the recipient-allocation hypothesis solely as a simulator diagnostic. Whether credit belongs to supporter, recipient, both, or neither is unresolved.',
    '- Qualification reason codes explain outcomes without revealing private allegiance inputs or a future scoring formula.',
    '- High-volume legitimate activity can diminish through neutral repeat caps without being labeled abuse.',
    '- Unaffiliated activity receives personal progression and no faction projection.',
    '- Policy V2 exists only to verify that the same raw ledger can be replayed into new projections.', '',
    '## Scenario outcomes', '',
    `- Wealthy-spender attempt: the supporter receives no personal credit under the displayed recipient-allocation hypothesis; the synthetic recipient receives ${result.projections.personal['wealthy-spender-recipient']?.contribution || 0}. This does not decide production ownership.`,
    `- One large legitimate supporter: the creator receives ${result.projections.personal.one_large_supporter?.contribution || 0} simulated contribution.`,
    `- Many independent legitimate supporters: the creator receives ${result.projections.personal.many_supporters?.contribution || 0} simulated contribution. Breadth is represented by distinct finalized events, not copied onto each payment.`, '',
    '## Known limitations', '',
    '- Reach totals are distributed into disjoint per-event fixture windows; they are not copied wholesale onto every event. Production still requires deduplicated reach instrumentation.',
    '- Trust confidence of 1 is neutral in ordinary fixtures. Adverse trust states require explicit synthetic evidence.',
    '- The simulator does not decide supporter-versus-recipient economic credit, validate upper-level pacing, or implement seasons, allegiance, detectors, payments, or production progression.',
    '- Internal reason codes appear in this restricted QA artifact for auditability; public projections expose only public-safe categories.');
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
