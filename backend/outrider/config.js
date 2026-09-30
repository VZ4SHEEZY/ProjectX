'use strict';

function enabled(value) { return value === 'true'; }
function positiveInt(value, fallback) { const parsed = Number.parseInt(value, 10); return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback; }

function outriderConfig(env = process.env) {
  return Object.freeze({
    enabled: enabled(env.OUTRIDER_ENABLED),
    glassEnabled: enabled(env.OUTRIDER_GLASS_ENABLED),
    signalIngestionEnabled: enabled(env.OUTRIDER_SIGNAL_INGESTION_ENABLED),
    proposalSubmissionEnabled: enabled(env.OUTRIDER_PROPOSALS_ENABLED),
    runtimeEnabled: enabled(env.OUTRIDER_RUNTIME_ENABLED),
    observerEnabled: enabled(env.OUTRIDER_OBSERVER_ENABLED),
    maxActionsPerTick: positiveInt(env.OUTRIDER_MAX_ACTIONS_PER_TICK, 1),
    maxAgentsPerRun: positiveInt(env.OUTRIDER_MAX_AGENTS_PER_RUN, 4),
    executionTimeoutMs: positiveInt(env.OUTRIDER_EXECUTION_TIMEOUT_MS, 5000),
    maxTokensPerRun: positiveInt(env.OUTRIDER_MAX_TOKENS_PER_RUN, 2000),
    agentCooldownMs: positiveInt(env.OUTRIDER_AGENT_COOLDOWN_MS, 1000)
  });
}

module.exports = { outriderConfig };
