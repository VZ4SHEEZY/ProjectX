'use strict';

const rebuild = require('./rebuild');
const observability = require('../../services/observability');

function startRebuildScheduler({ policyIdentity, cadenceMs = 6 * 60 * 60 * 1000, batchSize = 25, concurrency = 2, onError = console.error } = {}) {
  const boundedCadence = Math.min(7 * 24 * 60 * 60 * 1000, Math.max(15 * 60 * 1000, Number.parseInt(cadenceMs, 10) || 6 * 60 * 60 * 1000));
  let stopped = false; let running = false;
  const tick = async () => {
    if (stopped || running) return;
    running = true;
    const scheduledAt = new Date(Math.floor(Date.now() / boundedCadence) * boundedCadence).toISOString();
    const operationKey = `scheduled-rebuild:${policyIdentity.artifactDigest}:${scheduledAt}`;
    const started = Date.now();
    try {
      let result;
      do { result = await rebuild.runGlobalBatch({ operationKey, policyIdentity, batchSize, concurrency }); } while (!stopped && !result.complete);
      observability.write('info', 'progression_scheduled_rebuild_complete', { operationKey, durationMs: Date.now() - started, stats: result?.operation?.stats });
    } catch (error) { observability.recordError('progression_scheduled_rebuild_failure', error, { operationKey }); onError(error); }
    finally { running = false; }
  };
  const timer = setInterval(tick, boundedCadence); timer.unref?.();
  return async () => {
    stopped = true; clearInterval(timer);
    const deadline = Date.now() + 30_000;
    while (running && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 25));
  };
}

module.exports = Object.freeze({ startRebuildScheduler });
