'use strict';

const observability = require('../../services/observability');

const DEFAULTS = Object.freeze({ backlogAgeSeconds: 900, workerFailureCount: 3, staleProjectionRatio: 0.01, stalledSeconds: 1800 });

function evaluate(snapshot, { now = new Date(), thresholds = DEFAULTS, migration } = {}) {
  const alerts = [];
  const add = (condition, code, severity, fields = {}) => { if (condition) alerts.push({ event: 'progression_operational_alert', code, severity, ...fields }); };
  add(snapshot.outbox.oldestPendingAgeSeconds > thresholds.backlogAgeSeconds, 'OUTBOX_BACKLOG_AGE', 'page', { value: snapshot.outbox.oldestPendingAgeSeconds });
  add(snapshot.worker.consecutiveFailures >= thresholds.workerFailureCount, 'WORKER_REPEATED_FAILURE', 'page', { value: snapshot.worker.consecutiveFailures });
  add(snapshot.projections.rebuildFailures > 0, 'PROJECTION_REBUILD_FAILURE', 'page', { value: snapshot.projections.rebuildFailures });
  const total = snapshot.projections.availableProjectionCount + snapshot.projections.unavailableProjectionCount;
  add(total > 0 && snapshot.projections.staleProjectionCount / total > thresholds.staleProjectionRatio, 'EXCESSIVE_STALE_PROJECTIONS', 'warn', { value: snapshot.projections.staleProjectionCount, total });
  for (const operation of [snapshot.backfill, snapshot.projections.checkpoint].filter(Boolean)) {
    const heartbeat = operation.lastHeartbeatAt ? new Date(operation.lastHeartbeatAt) : null;
    add(['pending', 'running'].includes(operation.status) && heartbeat && (now - heartbeat) / 1000 > thresholds.stalledSeconds, 'OPERATION_STALLED', 'page', { operationKey: operation.operationKey });
  }
  add(migration?.status === 'failed', 'MIGRATION_FAILURE', 'page');
  add(migration?.transactionCapable === false, 'TRANSACTION_CAPABILITY_FAILURE', 'page');
  return alerts;
}

function emit(alerts) { for (const alert of alerts) observability.write(alert.severity === 'warn' ? 'warn' : 'error', alert.event, alert); return alerts; }

function startMonitor({ snapshot, intervalMs = 60_000, onError = error => observability.recordError('progression_alert_monitor_failure', error) } = {}) {
  if (typeof snapshot !== 'function') throw new TypeError('snapshot function is required');
  let stopped = false; let running = false;
  const tick = async () => {
    if (stopped || running) return;
    running = true;
    try { emit(evaluate(await snapshot())); } catch (error) { onError(error); } finally { running = false; }
  };
  const timer = setInterval(tick, Math.min(15 * 60_000, Math.max(30_000, Number.parseInt(intervalMs, 10) || 60_000)));
  timer.unref?.();
  return async () => { stopped = true; clearInterval(timer); while (running) await new Promise(resolve => setTimeout(resolve, 25)); };
}

module.exports = Object.freeze({ DEFAULTS, evaluate, emit, startMonitor });
