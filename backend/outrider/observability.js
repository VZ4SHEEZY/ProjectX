'use strict';

const observability = require('../services/observability');
const { outriderConfig } = require('./config');

const counters = { requests: 0, denied: 0, errors: 0, signalsAccepted: 0, proposalsSubmitted: 0 };
function increment(name) { if (Object.hasOwn(counters, name)) counters[name] += 1; }
function log(event, fields = {}) { observability.write('info', `outrider_${event}`, fields); }
function readiness(env = process.env) {
  const flags = outriderConfig(env);
  const contradictions = [];
  if (!flags.enabled && Object.entries(flags).some(([key, value]) => key !== 'enabled' && value)) contradictions.push('subsystem_enabled_while_outrider_disabled');
  if (flags.runtimeEnabled) contradictions.push('phase_0_runtime_must_remain_disabled');
  return { status: contradictions.length ? 'not_ready' : 'ready', phase: 0, flags, counters: { ...counters }, contradictions };
}
function resetForTests() { Object.keys(counters).forEach(key => { counters[key] = 0; }); }

module.exports = { increment, log, readiness, resetForTests };
