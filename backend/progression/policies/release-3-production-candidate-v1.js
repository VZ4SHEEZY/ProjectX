'use strict';

const { canonicalPolicyArtifact } = require('../policy-artifact');
const { loadPolicy, builtinPolicyCode } = require('../policy-runtime');

// Immutable production-candidate identity for the already-approved Release 3A
// qualification and scoring behavior. The implementation bytes are deliberately
// identical to simulation-v1; only rollout metadata and identity differ.
const policyId = 'cyberdope-release-3-progression';
const version = '2026-09-release-3-v1';
const evidenceEligibility = Object.freeze(Object.fromEntries([
  ['creation.published', ['reach', 'fraud_trust']], ['engagement.received', ['reach', 'fraud_trust']], ['relationship.formed', ['reach', 'fraud_trust']],
  ['achievement.reached', ['reach', 'fraud_trust']], ['builder.adopted', ['reach', 'fraud_trust']], ['economy.support.final', ['reach', 'fraud_trust', 'economic_finality']]
].map(([eventType, permittedTypes]) => [eventType, {
  permittedTypes,
  requiredTypes: eventType === 'economy.support.final' ? ['economic_finality'] : [],
  authorities: Object.fromEntries(permittedTypes.map(type => [type, type === 'economic_finality'
    ? ['payment-service', 'release-3a-simulator']
    : type === 'fraud_trust'
      ? ['moderation-service', 'release-3a-simulator']
      : ['social-service', 'release-3a-simulator']]))
}])));

const artifact = canonicalPolicyArtifact({
  policyId,
  version,
  code: builtinPolicyCode(version),
  config: {
    profile: 'release-3a-approved-v1',
    deploymentClass: 'release-progression',
    behaviorBaseline: 'release-3a-simulation-v1',
    weightsStatus: 'RELEASE 3 APPROVED / PRODUCTION CANDIDATE'
  },
  detectorVersions: { fraud_trust: 'release-3a-trust-signals-v2' },
  evidenceContractVersions: { reach: '1.0.0', fraud_trust: '1.0.0', economic_finality: '1.0.0', moderation: '1.0.0' },
  evidenceEligibility,
  taxonomyVersion: 'release-3a-1.2.0',
  numericRules: { values: 'finite-number', money: 'decimal-minor-unit-string' },
  roundingRules: { projection: 'nearest-cent' },
  runtimeCompatibility: { node: '22' },
  serialization: 'RFC8785-compatible-stable-json-v1'
});
const qualification = loadPolicy(artifact);

module.exports = Object.freeze({ policyId, version, artifact, artifactDigest: artifact.artifactDigest, codeDigest: artifact.codeDigest, qualification });
