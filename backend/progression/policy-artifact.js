'use strict';

const { deepFreeze, stableJson } = require('./contracts');
const crypto = require('node:crypto');

function canonicalPolicyArtifact(input) {
  const required = ['policyId', 'version', 'codeDigest', 'configDigest', 'detectorVersions', 'evidenceContractVersions', 'taxonomyVersion', 'numericRules', 'roundingRules', 'runtimeCompatibility', 'serialization'];
  for (const field of required) if (input[field] == null || input[field] === '') throw new TypeError(`policy artifact requires ${field}`);
  if (input.serialization !== 'RFC8785-compatible-stable-json-v1') throw new TypeError('unsupported canonical serialization');
  const artifact = Object.fromEntries(required.map(field => [field, input[field]]));
  const artifactDigest = `sha256:${crypto.createHash('sha256').update(stableJson(artifact)).digest('hex')}`;
  return deepFreeze({ ...artifact, artifactDigest });
}

module.exports = { canonicalPolicyArtifact };
