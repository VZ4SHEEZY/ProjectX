'use strict';

const { QualificationPolicy } = require('../qualification');

const version = 'sim-2026-08-v1';
// SHA-256 of the immutable simulator artifact identifier
// `sim-2026-08-v1:qualification+contribution-contract-v1`.
const artifactDigest = 'sha256:1e225066ae00ba617bc8d347dbe21d71dbac98574f237d9ffa4b746554afda42';

const qualification = new QualificationPolicy({
  version,
  artifactDigest,
  evaluate(event) {
    const a = event.attributes;
    const reasons = [];
    if (event.actorId === event.beneficiaryId && event.activityClass !== 'CREATE') return reject('SELF_INTERACTION');
    if (event.activityClass === 'TRANSACT' && event.economic?.status !== 'final') return quarantine('ECONOMIC_NOT_FINAL');
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
});

function contribution(event, decision) {
  const a = event.attributes;
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
  const allegiance = clamp(a.hiddenAllegianceWeight ?? 1, 0.25, 1.25); // private simulator input, never emitted
  const faction = event.affiliations.beneficiary.state === 'affiliated' ? (personal * 0.28 + cross * 1.7) * (0.5 + diversity) * allegiance : 0;
  return { personal, specialties, crossFactionInfluence: cross, faction, reasonCodes: cross > 4 ? ['DIVERSE_CROSS_FACTION_REACH'] : [] };
}

function reject(reason) { return { state: 'rejected', factor: 0, reasonCodes: [reason] }; }
function quarantine(reason) { return { state: 'quarantined', factor: 0, reasonCodes: [reason] }; }
function clamp(value, min, max) { return Math.min(max, Math.max(min, Number(value))); }

module.exports = { version, artifactDigest, qualification, contribution };
