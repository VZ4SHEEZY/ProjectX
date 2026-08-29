'use strict';

const { canonicalPolicyArtifact } = require('../policy-artifact');
const { loadPolicy, builtinPolicyCode } = require('../policy-runtime');

const version = 'sim-2026-08-v1';
const evidenceEligibility = Object.freeze(Object.fromEntries([
  ['creation.published', ['reach', 'fraud_trust']], ['engagement.received', ['reach', 'fraud_trust']], ['relationship.formed', ['reach', 'fraud_trust']],
  ['achievement.reached', ['reach', 'fraud_trust']], ['builder.adopted', ['reach', 'fraud_trust']], ['economy.support.final', ['reach', 'fraud_trust', 'economic_finality']]
].map(([eventType, permittedTypes]) => [eventType, { permittedTypes, requiredTypes: eventType === 'economy.support.final' ? ['economic_finality'] : [], authorities: Object.fromEntries(permittedTypes.map(type => [type, type === 'economic_finality' ? ['release-3a-simulator', 'payment-service'] : ['release-3a-simulator']])) }])));
const policyConfig = Object.freeze({ profile: 'simulation-v1', weightsStatus: 'SIMULATION ONLY / NOT PRODUCTION' });
const policyCode = builtinPolicyCode(version);
const artifact = canonicalPolicyArtifact({ policyId: 'release-3a-simulator', version, code: policyCode, config: policyConfig, detectorVersions: { fraud_trust: 'synthetic-fixture-signals-v2' }, evidenceContractVersions: { reach: '1.0.0', fraud_trust: '1.0.0', economic_finality: '1.0.0', moderation: '1.0.0' }, evidenceEligibility, taxonomyVersion: 'release-3a-1.2.0', numericRules: { values: 'finite-number', money: 'decimal-minor-unit-string' }, roundingRules: { projection: 'nearest-cent' }, runtimeCompatibility: { node: '22' }, serialization: 'RFC8785-compatible-stable-json-v1' });
const artifactDigest = artifact.artifactDigest;

const qualification = loadPolicy(artifact);
module.exports = Object.freeze({ version, artifact, artifactDigest, qualification });
