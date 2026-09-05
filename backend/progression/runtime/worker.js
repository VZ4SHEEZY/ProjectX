'use strict';

const ProgressionOutbox = require('../../models/ProgressionOutbox');
const persistence = require('../persistence/service');
const observability = require('../../services/observability');

const LOCK_TIMEOUT_MS = 5 * 60 * 1000;

async function processNext({ now = new Date() } = {}) {
  const stale = new Date(now.getTime() - LOCK_TIMEOUT_MS);
  const item = await ProgressionOutbox.findOneAndUpdate(
    { availableAt: { $lte: now }, $or: [{ status: { $in: ['pending', 'failed'] } }, { status: 'processing', lockedAt: { $lt: stale } }] },
    { $set: { status: 'processing', lockedAt: now }, $inc: { attempts: 1 }, $unset: { lastError: 1 } },
    { sort: { createdAt: 1, eventId: 1 }, new: true }
  ).select('+event +evidence');
  if (!item) return null;
  try {
    for (const evidence of item.evidence) await persistence.appendEvidence(evidence);
    await persistence.appendEvent(item.event);
    const processedAt = new Date();
    await ProgressionOutbox.updateOne({ _id: item._id, status: 'processing' }, { $set: { status: 'processed', processedAt, lockedAt: null } });
    observability.write('info', 'progression_shadow_processed', { eventId: item.eventId, producer: item.event.provenance.producer, sourceType: item.event.sourceIdentity.objectType, attempts: item.attempts, processedAt: processedAt.toISOString() });
    return { eventId: item.eventId, status: 'processed' };
  } catch (error) {
    const delay = Math.min(60_000, 1000 * (2 ** Math.min(item.attempts, 6)));
    await ProgressionOutbox.updateOne({ _id: item._id, status: 'processing' }, { $set: { status: 'failed', availableAt: new Date(Date.now() + delay), lockedAt: null, lastError: String(error.message || error).slice(0, 1000) } });
    observability.recordError('progression_shadow_processing_failure', error, { eventId: item.eventId, producer: item.event?.provenance?.producer || 'unknown', sourceType: item.event?.sourceIdentity?.objectType || 'unknown', attempts: item.attempts });
    return { eventId: item.eventId, status: 'failed', error };
  }
}

async function operationalMetrics() {
  const [statuses, lastSuccess, classifications] = await Promise.all([
    ProgressionOutbox.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, attempts: { $sum: '$attempts' } } }]),
    ProgressionOutbox.findOne({ status: 'processed' }).sort({ processedAt: -1 }).select('processedAt').lean(),
    ProgressionOutbox.aggregate([{ $group: { _id: { producer: '$event.provenance.producer', sourceType: '$event.sourceIdentity.objectType' }, count: { $sum: 1 } } }, { $sort: { '_id.producer': 1, '_id.sourceType': 1 } }])
  ]);
  const byStatus = Object.fromEntries(statuses.map(row => [row._id, row.count]));
  return {
    pending: (byStatus.pending || 0) + (byStatus.processing || 0),
    processed: byStatus.processed || 0,
    failed: byStatus.failed || 0,
    retries: statuses.reduce((total, row) => total + Math.max(0, row.attempts - row.count), 0),
    lastSuccessfulProcessingTime: lastSuccess?.processedAt?.toISOString() || null,
    sources: classifications.map(row => ({ producer: row._id.producer, sourceType: row._id.sourceType, count: row.count }))
  };
}

async function rebuildShadowProjection(args) {
  try { return await persistence.rebuildProjection(args); }
  catch (error) {
    observability.recordError('progression_shadow_rebuild_failure', error, { projectionContextId: args?.projectionContext?.projectionContextId || 'unknown' });
    throw error;
  }
}

function startShadowWorker({ intervalMs = 1000, onError = console.error } = {}) {
  let stopped = false; let running = false;
  const timer = setInterval(async () => {
    if (stopped || running) return;
    running = true;
    try { while (!stopped && await processNext()) {} } catch (error) { onError(error); } finally { running = false; }
  }, intervalMs);
  timer.unref?.();
  return () => { stopped = true; clearInterval(timer); };
}

module.exports = Object.freeze({ processNext, startShadowWorker, operationalMetrics, rebuildShadowProjection, LOCK_TIMEOUT_MS });
