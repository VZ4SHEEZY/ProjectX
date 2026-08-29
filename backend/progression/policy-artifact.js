'use strict';

const crypto = require('node:crypto');
const { deepFreeze, stableJson } = require('./contracts');
const DIGEST = /^sha256:[a-f0-9]{64}$/;

function canonicalPolicyArtifact(input) {
  const allowed = ['policyId', 'version', 'code', 'config', 'codeDigest', 'configDigest', 'detectorVersions', 'evidenceContractVersions', 'evidenceEligibility', 'taxonomyVersion', 'numericRules', 'roundingRules', 'runtimeCompatibility', 'serialization', 'artifactDigest'];
  if (!input || Object.keys(input).some(key => !allowed.includes(key))) throw new TypeError('policy artifact contains unsupported fields');
  for (const field of ['policyId', 'version', 'taxonomyVersion']) boundedString(input[field], field);
  if (input.serialization !== 'RFC8785-compatible-stable-json-v1') throw new TypeError('unsupported canonical serialization');
  if (typeof input.code !== 'string' || !input.code || input.code.length > 262144) throw new TypeError('policy artifact requires bounded code content');
  if (!plainObject(input.config)) throw new TypeError('policy artifact requires policy configuration content');
  boundedMetadata(input.config, 'config');
  for (const field of ['detectorVersions', 'evidenceContractVersions', 'evidenceEligibility', 'numericRules', 'roundingRules', 'runtimeCompatibility']) boundedMetadata(input[field], field);
  const codeDigest = sha256(input.code);
  const configDigest = sha256(stableJson(input.config));
  if (input.codeDigest && input.codeDigest !== codeDigest) throw new TypeError('policy codeDigest does not match code bytes');
  if (input.configDigest && input.configDigest !== configDigest) throw new TypeError('policy configDigest does not match canonical configuration');
  const material = { policyId: input.policyId, version: input.version, codeDigest, configDigest, detectorVersions: input.detectorVersions, evidenceContractVersions: input.evidenceContractVersions, evidenceEligibility: input.evidenceEligibility, taxonomyVersion: input.taxonomyVersion, numericRules: input.numericRules, roundingRules: input.roundingRules, runtimeCompatibility: input.runtimeCompatibility, serialization: input.serialization };
  const artifactDigest = sha256(stableJson(material));
  if (input.artifactDigest && input.artifactDigest !== artifactDigest) throw new TypeError('policy artifact digest mismatch');
  return deepFreeze({ ...material, code: input.code, config: input.config, artifactDigest });
}

function verifyPolicyArtifact(artifact, runtime = {}) {
  const canonical = canonicalPolicyArtifact(artifact);
  if (!artifact.artifactDigest || artifact.artifactDigest !== canonical.artifactDigest) throw new TypeError('policy artifact digest mismatch');
  if (runtime.node && canonical.runtimeCompatibility.node !== runtime.node) throw new Error('POLICY_RUNTIME_INCOMPATIBLE');
  return canonical;
}

function verifiedArtifactReference(input, resolver) {
  if (!input || typeof input.uri !== 'string' || !input.uri.startsWith('immutable:') || !DIGEST.test(input.digest || '')) throw new TypeError('invalid immutable artifact reference');
  if (typeof resolver !== 'function') throw new TypeError('artifact reference requires a verifier/resolver');
  const bytes = resolver(input.uri);
  if (!Buffer.isBuffer(bytes) && typeof bytes !== 'string') throw new TypeError('artifact resolver must return immutable bytes');
  if (sha256(bytes) !== input.digest) throw new Error('ARTIFACT_REFERENCE_DIGEST_MISMATCH');
  return deepFreeze({ uri: input.uri, digest: input.digest });
}

function boundedMetadata(value, name) {
  if (!plainObject(value) || stableJson(value).length > 32768) throw new TypeError(`${name} must be a bounded object`);
  let nodes = 0;
  const forbidden = /(?:secret|credential|password|privatekey|paymentdetails|rawcontent|locationhistory|relationshipgraph|hiddenallegiance|factionaffinity)/i;
  (function visit(current, depth) {
    if (++nodes > 2048 || depth > 8) throw new TypeError(`${name} metadata exceeds structural bounds`);
    if (Array.isArray(current)) {
      if (current.length > 256) throw new TypeError(`${name} metadata array exceeds bounds`);
      current.forEach(item => visit(item, depth + 1)); return;
    }
    if (plainObject(current)) {
      const entries = Object.entries(current);
      if (entries.length > 256) throw new TypeError(`${name} metadata object exceeds bounds`);
      for (const [key, item] of entries) { if (!key || key.length > 128 || forbidden.test(key)) throw new TypeError(`${name} contains forbidden or unbounded metadata key`); visit(item, depth + 1); }
      return;
    }
    if (typeof current === 'string' && current.length > 1024) throw new TypeError(`${name} metadata string exceeds bounds`);
    if (typeof current === 'number' && !Number.isFinite(current)) throw new TypeError(`${name} metadata number must be finite`);
    if (!['string', 'number', 'boolean'].includes(typeof current) && current !== null) throw new TypeError(`${name} metadata contains unsupported value`);
  }(value, 0));
}
function plainObject(value) { return value && typeof value === 'object' && !Array.isArray(value); }
function boundedString(value, name) { if (typeof value !== 'string' || !value || value.length > 256) throw new TypeError(`${name} must be a bounded non-empty string`); }
function sha256(value) { return `sha256:${crypto.createHash('sha256').update(value).digest('hex')}`; }

module.exports = { canonicalPolicyArtifact, verifyPolicyArtifact, verifiedArtifactReference };
