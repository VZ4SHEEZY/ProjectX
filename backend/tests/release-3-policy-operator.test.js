'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const simulation = require('../progression/policies/simulation-v1');
const candidate = require('../progression/policies/release-3-production-candidate-v1');
const { simulate } = require('../progression/simulator/run');
const { canonicalPolicyArtifact } = require('../progression/policy-artifact');
const operator = require('../scripts/progression-policy');

test('production candidate preserves Release 3A implementation and scoring outputs', () => {
  assert.equal(candidate.codeDigest, simulation.artifact.codeDigest);
  const baseline = simulate(simulation);
  const actual = simulate(candidate);
  assert.deepEqual(actual.events, baseline.events);
  assert.deepEqual(actual.decisions.map(stripIdentity), baseline.decisions.map(stripIdentity));
  assert.deepEqual(stripProjectionIdentity(actual.projections), stripProjectionIdentity(baseline.projections));
});

test('candidate and simulation artifact digests and code digests are deterministic', () => {
  const rebuilt = canonicalPolicyArtifact(candidate.artifact);
  assert.equal(rebuilt.artifactDigest, candidate.artifactDigest);
  assert.equal(rebuilt.codeDigest, candidate.codeDigest);
  assert.equal(simulation.artifact.config.profile, 'simulation-v1');
  assert.equal(simulation.artifact.config.weightsStatus, 'SIMULATION ONLY / NOT PRODUCTION');
});

test('operator rejects simulation-only artifacts for staging and production', () => {
  assert.throws(() => operator.assertApprovedForTarget(simulation.artifact, 'staging'), /SIMULATION_POLICY_REJECTED_FOR_STAGING/);
  assert.throws(() => operator.assertApprovedForTarget(simulation.artifact, 'production'), /SIMULATION_POLICY_REJECTED_FOR_PRODUCTION/);
  assert.equal(operator.assertApprovedForTarget(candidate.artifact, 'staging'), candidate.artifact);
});

test('operator requires exact identity and fails closed on mismatches', () => {
  const exact = { 'policy-id': candidate.policyId, version: candidate.version, 'artifact-digest': candidate.artifactDigest };
  assert.equal(operator.verifyRequestedIdentity(candidate.artifact, exact), candidate.artifact);
  assert.throws(() => operator.verifyRequestedIdentity(candidate.artifact, { ...exact, version: 'wrong' }), /POLICY_VERSION_MISMATCH/);
  assert.throws(() => operator.parseArgs(['--artifact', 'x']), /--target is required/);
});

test('exact persistence is idempotent and conflicting identity fails closed', async () => {
  let stored = null; let inserts = 0;
  const repositoryApi = {
    async getPolicyArtifact(identity) {
      if (!stored) return null;
      if (identity.artifactDigest && identity.artifactDigest !== stored.artifactDigest) return null;
      if (identity.policyId && identity.policyId !== stored.policyId) return null;
      if (identity.version && identity.version !== stored.version) return null;
      return stored;
    },
    async appendPolicyArtifact(artifact) { inserts += 1; stored = { ...artifact, canonicalPayload: artifact }; }
  };
  assert.equal((await operator.persistVerifiedArtifact(candidate.artifact, { repositoryApi })).outcome, 'persisted');
  assert.equal((await operator.persistVerifiedArtifact(candidate.artifact, { repositoryApi })).outcome, 'already-present');
  assert.equal(inserts, 1);
  const conflicting = canonicalPolicyArtifact({ ...candidate.artifact, config: { ...candidate.artifact.config, profile: 'conflict' }, artifactDigest: undefined, configDigest: undefined });
  await assert.rejects(operator.persistVerifiedArtifact(conflicting, { repositoryApi }), /PROGRESSION_POLICY_IDENTITY_COLLISION/);
});

function stripIdentity(decision) {
  const { decisionId, policyId, policyVersion, policyArtifactDigest, projectionContextId, ...rest } = decision;
  return rest;
}
function stripProjectionIdentity(projection) {
  const { policyVersion, projectionContext, generationMetadata, ...rest } = projection;
  return { ...rest, projectionContext: stripObjectIdentity(projectionContext), generationMetadata: stripObjectIdentity(generationMetadata) };
}
function stripObjectIdentity(value) {
  const { policyId, policyVersion, policyArtifactDigest, projectionContextId, ...rest } = value;
  return rest;
}
