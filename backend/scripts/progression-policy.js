'use strict';

require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
const { stableJson } = require('../progression/contracts');
const { verifyPolicyArtifact } = require('../progression/policy-artifact');
const repository = require('../progression/persistence/repository');

const TARGETS = new Set(['local', 'staging', 'production']);

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--apply') args.apply = true;
    else if (['--artifact', '--target', '--policy-id', '--version', '--artifact-digest'].includes(value)) args[value.slice(2)] = argv[++index];
    else throw new Error(`Unknown or incomplete argument: ${value}`);
  }
  for (const key of ['artifact', 'target', 'policy-id', 'version', 'artifact-digest']) if (!args[key]) throw new Error(`--${key} is required`);
  if (!TARGETS.has(args.target)) throw new Error('--target must be local, staging, or production');
  return args;
}

function loadArtifact(artifactPath) {
  const resolved = path.resolve(artifactPath);
  if (!fs.statSync(resolved).isFile()) throw new Error('Policy artifact path must identify a file');
  let candidate;
  if (path.extname(resolved) === '.json') candidate = JSON.parse(fs.readFileSync(resolved, 'utf8'));
  else if (path.extname(resolved) === '.js' || path.extname(resolved) === '.cjs') candidate = require(resolved).artifact;
  else throw new Error('Policy artifact path must end in .json, .js, or .cjs');
  return verifyPolicyArtifact(candidate, { node: '22' });
}

function assertApprovedForTarget(artifact, target) {
  if (target === 'local') return artifact;
  const simulationOnly = artifact.policyId.includes('simulator') || artifact.version.startsWith('sim-') || artifact.config?.deploymentClass !== 'release-progression' || /SIMULATION ONLY/i.test(artifact.config?.weightsStatus || '');
  if (simulationOnly) throw new Error(`SIMULATION_POLICY_REJECTED_FOR_${target.toUpperCase()}`);
  return artifact;
}

function verifyRequestedIdentity(artifact, args) {
  if (artifact.policyId !== args['policy-id']) throw new Error('POLICY_ID_MISMATCH');
  if (artifact.version !== args.version) throw new Error('POLICY_VERSION_MISMATCH');
  if (artifact.artifactDigest !== args['artifact-digest']) throw new Error('POLICY_ARTIFACT_DIGEST_MISMATCH');
  return artifact;
}

async function persistVerifiedArtifact(artifact, { repositoryApi = repository } = {}) {
  const existingIdentity = await repositoryApi.getPolicyArtifact({ policyId: artifact.policyId, version: artifact.version });
  if (existingIdentity) {
    if (existingIdentity.artifactDigest !== artifact.artifactDigest || existingIdentity.codeDigest !== artifact.codeDigest || stableJson(existingIdentity.canonicalPayload) !== stableJson(artifact)) throw new Error('PROGRESSION_POLICY_IDENTITY_COLLISION');
    return { outcome: 'already-present', policyId: artifact.policyId, version: artifact.version, artifactDigest: artifact.artifactDigest, codeDigest: artifact.codeDigest };
  }
  const existingDigest = await repositoryApi.getPolicyArtifact({ artifactDigest: artifact.artifactDigest });
  if (existingDigest && (existingDigest.policyId !== artifact.policyId || existingDigest.version !== artifact.version || stableJson(existingDigest.canonicalPayload) !== stableJson(artifact))) throw new Error('PROGRESSION_POLICY_DIGEST_COLLISION');
  await repositoryApi.appendPolicyArtifact(artifact);
  return { outcome: 'persisted', policyId: artifact.policyId, version: artifact.version, artifactDigest: artifact.artifactDigest, codeDigest: artifact.codeDigest };
}

function verificationResult(artifact, target) {
  return { mode: 'verify', target, policyId: artifact.policyId, version: artifact.version, artifactDigest: artifact.artifactDigest, codeDigest: artifact.codeDigest, approvedForTarget: true };
}

async function cli(argv = process.argv.slice(2), env = process.env) {
  const args = parseArgs(argv);
  const artifact = verifyRequestedIdentity(assertApprovedForTarget(loadArtifact(args.artifact), args.target), args);
  if (!args.apply) return verificationResult(artifact, args.target);
  if (env.PROGRESSION_POLICY_TARGET !== args.target) throw new Error('PROGRESSION_POLICY_TARGET must exactly match --target');
  if (env.CONFIRM_PROGRESSION_POLICY_PERSIST !== `APPLY:${args.target}`) throw new Error(`Set CONFIRM_PROGRESSION_POLICY_PERSIST=APPLY:${args.target} to mutate`);
  if (!env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  await mongoose.connect(env.MONGODB_URI, { autoIndex: false, autoCreate: false });
  try { return { mode: 'apply', target: args.target, ...(await persistVerifiedArtifact(artifact)) }; }
  finally { await mongoose.disconnect(); }
}

if (require.main === module) cli().then(result => console.log(JSON.stringify(result, null, 2))).catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { parseArgs, loadArtifact, assertApprovedForTarget, verifyRequestedIdentity, persistVerifiedArtifact, cli };
