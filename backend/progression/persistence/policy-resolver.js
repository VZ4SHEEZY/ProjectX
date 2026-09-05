'use strict';

const { verifyPolicyArtifact } = require('../policy-artifact');
const { loadPolicy } = require('../policy-runtime');
const repository = require('./repository');

async function resolvePersistedPolicy(identity, options = {}) {
  assertPolicyIdentity(identity);
  const stored = await repository.getPolicyArtifact(identity, options);
  if (!stored) throw new Error('PROGRESSION_POLICY_ARTIFACT_NOT_FOUND');
  const artifact = verifyPolicyArtifact(stored.canonicalPayload);
  if (artifact.policyId !== identity.policyId || artifact.version !== identity.version || artifact.artifactDigest !== identity.artifactDigest) {
    throw new Error('PROGRESSION_POLICY_ARTIFACT_IDENTITY_MISMATCH');
  }
  if (stored.policyId !== artifact.policyId || stored.version !== artifact.version || stored.artifactDigest !== artifact.artifactDigest || stored.codeDigest !== artifact.codeDigest) {
    throw new Error('PROGRESSION_POLICY_ARTIFACT_STORAGE_MISMATCH');
  }
  const qualification = loadPolicy(artifact);
  return Object.freeze({ artifact, version: artifact.version, artifactDigest: artifact.artifactDigest, qualification });
}

function assertPolicyIdentity(identity) {
  if (!identity || Object.keys(identity).some(key => !['policyId', 'version', 'artifactDigest'].includes(key))) throw new TypeError('persisted policy identity is required');
  for (const field of ['policyId', 'version']) if (typeof identity[field] !== 'string' || !identity[field] || identity[field].length > 256) throw new TypeError(`persisted policy identity requires ${field}`);
  if (!/^sha256:[a-f0-9]{64}$/.test(identity.artifactDigest || '')) throw new TypeError('persisted policy identity requires artifactDigest');
}

module.exports = { resolvePersistedPolicy };
