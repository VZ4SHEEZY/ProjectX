'use strict';

function enabled(value) { return value === 'true'; }

function outriderConfig(env = process.env) {
  return Object.freeze({
    enabled: enabled(env.OUTRIDER_ENABLED),
    glassEnabled: enabled(env.OUTRIDER_GLASS_ENABLED),
    signalIngestionEnabled: enabled(env.OUTRIDER_SIGNAL_INGESTION_ENABLED),
    proposalSubmissionEnabled: enabled(env.OUTRIDER_PROPOSALS_ENABLED),
    runtimeEnabled: enabled(env.OUTRIDER_RUNTIME_ENABLED)
  });
}

module.exports = { outriderConfig };
