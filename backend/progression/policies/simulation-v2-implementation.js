'use strict';

const v1 = require('./simulation-v1-implementation');

function evaluate(event, context) {
  const result = v1.evaluate(event, context);
  if (result.state === 'diminished' && result.reasonCodes.includes('REPEATED_ACTION_DIMINISHING')) {
    return { ...result, factor: result.factor * 0.75, reasonCodes: [...result.reasonCodes, 'V2_STRONGER_REPEAT_DECAY'] };
  }
  return result;
}

module.exports = Object.freeze({ evaluate, contribution: v1.contribution });
