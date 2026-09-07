'use strict';

function policyIdentity(env = process.env) {
  const identity = {
    policyId: env.PROGRESSION_POLICY_ID,
    version: env.PROGRESSION_POLICY_VERSION,
    artifactDigest: env.PROGRESSION_POLICY_ARTIFACT_DIGEST
  };
  if (!identity.policyId || !identity.version || !/^sha256:[a-f0-9]{64}$/.test(identity.artifactDigest || '')) throw new Error('Explicit persisted progression policy identity is required');
  return identity;
}

function operationsEnabled(env = process.env) { return env.PROGRESSION_OPERATIONS_ENABLED === 'true'; }
module.exports = Object.freeze({ policyIdentity, operationsEnabled });
