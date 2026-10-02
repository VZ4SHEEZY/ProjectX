'use strict';

const observability = require('../services/observability');
const { outriderConfig } = require('./config');

const counters = { requests: 0, denied: 0, errors: 0, signalsAccepted: 0, proposalsSubmitted: 0, executions: 0, observerEntries: 0 };
function increment(name) { if (Object.hasOwn(counters, name)) counters[name] += 1; }
function log(event, fields = {}) { observability.write('info', `outrider_${event}`, fields); }
function readiness(env = process.env) {
  const flags = outriderConfig(env);
  const contradictions = [];
  if (!flags.enabled && ['glassEnabled', 'signalIngestionEnabled', 'proposalSubmissionEnabled', 'runtimeEnabled', 'observerEnabled'].some(key => flags[key])) contradictions.push('subsystem_enabled_while_outrider_disabled');
  if (flags.runtimeEnabled && !['development', 'staging', 'test'].includes(env.OUTRIDER_ENV)) contradictions.push('runtime_requires_isolated_environment');
  if (env.NODE_ENV === 'production' && (flags.runtimeEnabled || flags.observerEnabled)) contradictions.push('phase_1_runtime_forbidden_in_production');
  return { status: contradictions.length ? 'not_ready' : 'ready', phase: 1, flags, counters: { ...counters }, contradictions };
}
function resetForTests() { Object.keys(counters).forEach(key => { counters[key] = 0; }); }

module.exports = { increment, log, readiness, resetForTests };
