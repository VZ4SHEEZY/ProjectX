'use strict';

const v1 = require('./simulation-v1');
const { QualificationPolicy } = require('../qualification');

// Deliberately small alternative policy used to prove replay/rebuild boundaries.
const version = 'sim-2026-08-v2-experimental';
const qualification = new QualificationPolicy({
  version,
  evaluate(event, context) {
    const result = v1.qualification.evaluate(event, context);
    if (result.state === 'diminished' && result.reasonCodes.includes('REPEATED_ACTION_DIMINISHING')) return { ...result, factor: result.factor * 0.75, reasonCodes: [...result.reasonCodes, 'V2_STRONGER_REPEAT_DECAY'] };
    return result;
  }
});

module.exports = { ...v1, version, qualification };
