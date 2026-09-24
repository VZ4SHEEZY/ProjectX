'use strict';

function policyIdentity(env = process.env) {
  const identity = {
    policyId: env.PROGRESSION_POLICY_ID,
    version: env.PROGRESSION_POLICY_VERSION,
    artifactDigest: env.PROGRESSION_POLICY_ARTIFACT_DIGEST
  };
  if (!identity.policyId || !identity.version || !/^sha256:[a-f0-9]{64}$/.test(identity.artifactDigest || '')) throw new Error('Explicit persisted progression policy identity is required');
  return identity;
}

function operationsEnabled(env = process.env) { return env.PROGRESSION_OPERATIONS_ENABLED === 'true'; }
function shadowWorkerEnabled(env = process.env) { return env.PROGRESSION_SHADOW_WORKER_ENABLED === 'true'; }
function dedicatedWorkerEnabled(env = process.env) { return operationsEnabled(env) && shadowWorkerEnabled(env); }
function livePipelineEnabled(env = process.env) { return env.PROGRESSION_LIVE_PIPELINE_ENABLED === 'true'; }
function processingScope(env = process.env) {
  const mode = env.PROGRESSION_PROCESSING_MODE || 'normal';
  if (!['normal', 'bounded'].includes(mode)) throw new Error('PROGRESSION_PROCESSING_MODE must be normal or bounded');
  if (mode === 'normal') return Object.freeze({ mode, eventIds: [] });
  const eventIds = [...new Set(String(env.PROGRESSION_BOUNDED_EVENT_IDS || '').split(',').map(value => value.trim()).filter(Boolean))];
  if (eventIds.length < 1 || eventIds.length > 25 || eventIds.some(value => !/^[a-f0-9]{32}$/.test(value))) throw new Error('bounded processing requires 1-25 canonical PROGRESSION_BOUNDED_EVENT_IDS');
  return Object.freeze({ mode, eventIds: Object.freeze(eventIds) });
}
module.exports = Object.freeze({ policyIdentity, operationsEnabled, shadowWorkerEnabled, dedicatedWorkerEnabled, livePipelineEnabled, processingScope });
