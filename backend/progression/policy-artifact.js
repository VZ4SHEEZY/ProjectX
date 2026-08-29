'use strict';

const { deepFreeze, stableJson } = require('./contracts');
const crypto = require('node:crypto');

function canonicalPolicyArtifact(input) {
  const required = ['policyId', 'version', 'codeDigest', 'configDigest', 'detectorVersions', 'evidenceContractVersions', 'taxonomyVersion', 'numericRules', 'roundingRules', 'runtimeCompatibility', 'serialization'];
  for (const field of required) if (input[field] == null || input[field] === '') throw new TypeError(`policy artifact requires ${field}`);
  if (input.serialization !== 'RFC8785-compatible-stable-json-v1') throw new TypeError('unsupported canonical serialization');
  const artifact = Object.fromEntries(required.map(field => [field, input[field]]));
  const artifactDigest = `sha256:${crypto.createHash('sha256').update(stableJson(artifact)).digest('hex')}`;
  if (input.artifactDigest && input.artifactDigest !== artifactDigest) throw new TypeError('policy artifact digest mismatch');
  return deepFreeze({ ...artifact, artifactDigest });
}

function verifyPolicyArtifact(artifact, runtime = {}) {
  const canonical = canonicalPolicyArtifact(artifact);
  if (artifact.artifactDigest !== canonical.artifactDigest) throw new TypeError('policy artifact digest mismatch');
  if (runtime.node && canonical.runtimeCompatibility.node !== runtime.node) throw new Error('POLICY_RUNTIME_INCOMPATIBLE');
  return canonical;
}

module.exports = { canonicalPolicyArtifact, verifyPolicyArtifact };
