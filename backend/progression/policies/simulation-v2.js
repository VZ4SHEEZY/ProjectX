'use strict';

const v1 = require('./simulation-v1');
const { QualificationPolicy } = require('../qualification');
const { canonicalPolicyArtifact } = require('../policy-artifact');

// Deliberately small alternative policy used to prove replay/rebuild boundaries.
const version = 'sim-2026-08-v2-experimental';
const { artifactDigest: ignoredDigest, ...baseArtifact } = v1.artifact;
const artifact = canonicalPolicyArtifact({ ...baseArtifact, version, codeDigest: 'sha256:2ca4d42edcd2c0b70a24185479d0f1944261246ecb59cbe7fca9d4d9d729b47e' });
const artifactDigest = artifact.artifactDigest;
const qualification = new QualificationPolicy({
  artifact,
  evaluate(event, context) {
    const result = v1.qualification.evaluate(event, context);
    if (result.state === 'diminished' && result.reasonCodes.includes('REPEATED_ACTION_DIMINISHING')) return { ...result, factor: result.factor * 0.75, reasonCodes: [...result.reasonCodes, 'V2_STRONGER_REPEAT_DECAY'] };
    return result;
  }
});

module.exports = { ...v1, version, artifact, artifactDigest, qualification };
