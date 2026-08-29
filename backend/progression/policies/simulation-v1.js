'use strict';

const { QualificationPolicy } = require('../qualification');
const { canonicalPolicyArtifact } = require('../policy-artifact');
const fs = require('node:fs');

const version = 'sim-2026-08-v1';
const evidenceEligibility = Object.freeze(Object.fromEntries([
  ['creation.published', ['reach', 'fraud_trust']], ['engagement.received', ['reach', 'fraud_trust']], ['relationship.formed', ['reach', 'fraud_trust']],
  ['achievement.reached', ['reach', 'fraud_trust']], ['builder.adopted', ['reach', 'fraud_trust']], ['economy.support.final', ['reach', 'fraud_trust', 'economic_finality']]
].map(([eventType, permittedTypes]) => [eventType, { permittedTypes, requiredTypes: eventType === 'economy.support.final' ? ['economic_finality'] : [], authorities: Object.fromEntries(permittedTypes.map(type => [type, type === 'economic_finality' ? ['release-3a-simulator', 'payment-service'] : ['release-3a-simulator']])) }])));
const policyConfig = Object.freeze({ profile: 'simulation-v1', weightsStatus: 'SIMULATION ONLY / NOT PRODUCTION' });
const policyCode = fs.readFileSync(__filename, 'utf8');
const artifact = canonicalPolicyArtifact({ policyId: 'release-3a-simulator', version, code: policyCode, config: policyConfig, detectorVersions: { fraud_trust: 'synthetic-fixture-signals-v2' }, evidenceContractVersions: { reach: '1.0.0', fraud_trust: '1.0.0', economic_finality: '1.0.0', moderation: '1.0.0' }, evidenceEligibility, taxonomyVersion: 'release-3a-1.2.0', numericRules: { values: 'finite-number', money: 'decimal-minor-unit-string' }, roundingRules: { projection: 'nearest-cent' }, runtimeCompatibility: { node: '22' }, serialization: 'RFC8785-compatible-stable-json-v1' });
const artifactDigest = artifact.artifactDigest;

const qualification = new QualificationPolicy({
  artifact,
  evaluate: qualificationEvaluator
});

function qualificationEvaluator(event, context) {
    const a = Object.assign({}, ...context.evidence.map(item => item.body.signals || item.body));
    const reasons = [];
    if (event.actorId === event.beneficiaryId && event.activityClass !== 'CREATE') return reject('SELF_INTERACTION');
    if (event.activityClass === 'TRANSACT' && event.economic?.state !== 'finalized') return quarantine('ECONOMIC_NOT_FINAL');
    if (a.moderated || a.abusive || a.reportManipulation) return reject('MODERATED_OR_ABUSIVE');
    if (a.linkedAccount || a.linkedWallet) return reject('RELATED_ACCOUNT_ACTIVITY');
    if (a.circularTransfer) return reject('CIRCULAR_ECONOMIC_ACTIVITY');
    if (a.sybilConfidence >= 0.8) return reject('HIGH_SYBIL_CONFIDENCE');
    if (a.botGenerated && !a.botDisclosure) return quarantine('UNDISCLOSED_BOT_ACTIVITY');
    let factor = clamp(a.trustConfidence ?? 1, 0, 1);
    if ((a.velocityPerHour || 0) > 120 && (a.valueSignal || 0) < 0.3) { factor *= 0.08; reasons.push('SUSPICIOUS_VELOCITY'); }
    if ((a.repeatOrdinal || 1) > 8) { factor *= 1 / Math.sqrt(a.repeatOrdinal); reasons.push('REPEATED_ACTION_DIMINISHING'); }
    if ((a.reciprocalDensity || 0) > 0.75) { factor *= 0.2; reasons.push('RECIPROCAL_RING_DIMINISHING'); }
    if ((a.sameFactionDensity || 0) > 0.85 && (a.uniquePeople || 0) < 5) { factor *= 0.25; reasons.push('SAME_FACTION_RING_DIMINISHING'); }
    if ((a.lowValueRatio || 0) > 0.8) { factor *= 0.15; reasons.push('LOW_VALUE_VOLUME_DIMINISHING'); }
    if ((a.trustConfidence ?? 1) < 0.35) return quarantine('LOW_ACCOUNT_CONFIDENCE');
    if (factor < 0.98) return { state: 'diminished', factor, reasonCodes: reasons.length ? reasons : ['TRUST_ADJUSTED'] };
    return { state: 'qualified', factor, reasonCodes: ['QUALIFIED'] };
}

function contribution(event, decision) {
  const a = decision.signals;
  const factor = decision.factor;
  const outcome = Math.log2(1 + Math.max(0, a.uniquePeople || 0)) + 1.4 * Math.log2(1 + Math.max(0, a.uniqueFactions || 0));
  const quality = 0.5 + 1.5 * clamp(a.valueSignal ?? 0.5, 0, 1);
  const baseByType = { 'creation.published': 5, 'engagement.received': 2, 'relationship.formed': 1.5, 'achievement.reached': 8, 'economy.support.final': 3, 'builder.adopted': 6 };
  let personal = (baseByType[event.eventType] || 1) * quality;
  const specialties = {};
  if (event.activityClass === 'CREATE') specialties.creation = personal;
  if (event.activityClass === 'ENGAGE') specialties.social = personal;
  if (event.activityClass === 'ACHIEVE') specialties.influence = personal;
  if (event.activityClass === 'TRANSACT') {
    // Bounded and logarithmic: breadth matters more than a single amount.
    const dollars = Number(event.economic.amountMinor) / 100;
    const breadth = Math.log2(1 + Math.max(1, a.uniqueSupporters || 1));
    personal = 2 + Math.min(10, Math.log10(1 + dollars) * 2) + breadth * 2;
    specialties.economy = personal;
    specialties.creator = personal * 0.6;
  }
  if (event.eventType === 'builder.adopted') specialties.builder_ai = personal;
  if (outcome > 0) { personal += outcome * quality; specialties.influence = (specialties.influence || 0) + outcome * quality; }
  personal *= factor;
  for (const key of Object.keys(specialties)) specialties[key] *= factor;

  const cross = Math.log2(1 + Math.max(0, a.uniqueFactions || 0)) * Math.log2(1 + Math.max(0, a.uniquePeople || 0)) * factor;
  const diversity = clamp(a.engagementDiversity ?? 0.5, 0, 1);
  const faction = event.affiliations.beneficiary.state === 'affiliated' ? (personal * 0.28 + cross * 1.7) * (0.5 + diversity) : 0;
  return { personal, specialties, crossFactionInfluence: cross, faction, publicExplanationCategories: cross > 4 ? ['CROSS_COMMUNITY_REACH'] : [] };
}

function reject(reason) { return { state: 'rejected', factor: 0, reasonCodes: [reason] }; }
function quarantine(reason) { return { state: 'quarantined', factor: 0, reasonCodes: [reason] }; }
function clamp(value, min, max) { return Math.min(max, Math.max(min, Number(value))); }

module.exports = { version, artifact, artifactDigest, qualification, contribution };
