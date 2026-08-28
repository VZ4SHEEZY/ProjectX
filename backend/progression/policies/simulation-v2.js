'use strict';

const v1 = require('./simulation-v1');
const { QualificationPolicy } = require('../qualification');

// Deliberately small alternative policy used to prove replay/rebuild boundaries.
const version = 'sim-2026-08-v2-experimental';
// SHA-256 of the immutable simulator artifact identifier
// `sim-2026-08-v2-experimental:qualification+contribution-contract-v1`.
const artifactDigest = 'sha256:1c8dae624a4053de81b6c136d4e5c0a70b53325f79d288267c1bd8a04283d682';
const qualification = new QualificationPolicy({
  version,
  artifactDigest,
  evaluate(event, context) {
    const result = v1.qualification.evaluate(event, context);
    if (result.state === 'diminished' && result.reasonCodes.includes('REPEATED_ACTION_DIMINISHING')) return { ...result, factor: result.factor * 0.75, reasonCodes: [...result.reasonCodes, 'V2_STRONGER_REPEAT_DECAY'] };
    return result;
  }
});

module.exports = { ...v1, version, artifactDigest, qualification };
