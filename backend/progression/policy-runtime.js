'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { verifyPolicyArtifact } = require('./policy-artifact');
const v1 = require('./policies/simulation-v1-implementation');
const v2 = require('./policies/simulation-v2-implementation');

const v1Path = path.join(__dirname, 'policies/simulation-v1-implementation.js');
const v1Code = fs.readFileSync(v1Path, 'utf8');
const v2Path = path.join(__dirname, 'policies/simulation-v2-implementation.js');
const v2Code = `${v1Code}\n${fs.readFileSync(v2Path, 'utf8')}`;
const builtins = new Map([[digest(v1Code), v1], [digest(v2Code), v2]]);

function loadPolicy(artifact) {
  const verified = verifyPolicyArtifact(artifact);
  const implementation = builtins.get(verified.codeDigest);
  if (!implementation) throw new Error('POLICY_IMPLEMENTATION_NOT_REGISTERED');
  return Object.freeze({ artifact: verified, version: verified.version, artifactDigest: verified.artifactDigest, evaluate: implementation.evaluate, contribution: implementation.contribution });
}

function digest(bytes) { return `sha256:${crypto.createHash('sha256').update(bytes).digest('hex')}`; }
function builtinPolicyCode(version) {
  if (version === 'sim-2026-08-v1' || version === '2026-09-release-3-v1') return v1Code;
  if (version === 'sim-2026-08-v2-experimental') return v2Code;
  throw new Error('POLICY_IMPLEMENTATION_NOT_REGISTERED');
}
module.exports = { loadPolicy, builtinPolicyCode };
