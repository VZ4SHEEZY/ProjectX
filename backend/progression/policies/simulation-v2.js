'use strict';

const v1 = require('./simulation-v1');
const { canonicalPolicyArtifact } = require('../policy-artifact');
const { loadPolicy, builtinPolicyCode } = require('../policy-runtime');

// Deliberately small alternative policy used to prove replay/rebuild boundaries.
const version = 'sim-2026-08-v2-experimental';
const { artifactDigest: ignoredDigest, codeDigest: ignoredCodeDigest, configDigest: ignoredConfigDigest, ...baseArtifact } = v1.artifact;
const artifact = canonicalPolicyArtifact({ ...baseArtifact, version, code: builtinPolicyCode(version), config: { ...baseArtifact.config, profile: 'simulation-v2-experimental' } });
const artifactDigest = artifact.artifactDigest;
const qualification = loadPolicy(artifact);

module.exports = Object.freeze({ version, artifact, artifactDigest, qualification });
