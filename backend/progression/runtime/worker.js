'use strict';

const mongoose = require('mongoose');
const crypto = require('node:crypto');
const ProgressionOutbox = require('../../models/ProgressionOutbox');
const ProgressionPipelineLease = require('../../models/ProgressionPipelineLease');
const persistence = require('../persistence/service');
const observability = require('../../services/observability');

const LOCK_TIMEOUT_MS = 5 * 60 * 1000;
const DEFAULT_MAX_ATTEMPTS = 8;
const workerState = { startedAt: null, stoppedAt: null, lastSuccessAt: null, lastFailureAt: null, processed: 0, decisions: 0, contributions: 0, personalProjections: 0, factionProjections: 0, failures: 0, consecutiveFailures: 0, staleLocksRecovered: 0, totalProcessingLatencyMs: 0, lastProcessingLatencyMs: null, maxProcessingLatencyMs: 0 };

function scopeQuery(processingScope = { mode: 'normal', eventIds: [] }) {
  if (processingScope.mode === 'normal') return {};
  if (processingScope.mode !== 'bounded' || !Array.isArray(processingScope.eventIds) || processingScope.eventIds.length < 1) throw new Error('INVALID_PROGRESSION_PROCESSING_SCOPE');
  return { eventId: { $in: processingScope.eventIds } };
}

async function acquirePipelineLease(now) {
  const ownerId = crypto.randomUUID();
  try {
    const lease = await ProgressionPipelineLease.findOneAndUpdate(
      { leaseKey: 'canonical-live-pipeline-v1', $or: [{ expiresAt: { $lte: now } }, { ownerId }] },
      { $set: { ownerId, acquiredAt: now, expiresAt: new Date(now.getTime() + LOCK_TIMEOUT_MS) }, $setOnInsert: { leaseKey: 'canonical-live-pipeline-v1' } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return lease?.ownerId === ownerId ? ownerId : null;
  } catch (error) {
    if (error?.code === 11000) return null;
    throw error;
  }
}

async function releasePipelineLease(ownerId) {
  if (ownerId) await ProgressionPipelineLease.deleteOne({ leaseKey: 'canonical-live-pipeline-v1', ownerId });
}

async function processNext(options = {}) {
  if (!options.policyIdentity) return processClaimed(options);
  const now = options.now || new Date();
  const ownerId = await acquirePipelineLease(now);
  if (!ownerId) return null;
  try { return await processClaimed({ ...options, now }); }
  finally { await releasePipelineLease(ownerId); }
}

async function processClaimed({ now = new Date(), maxAttempts = DEFAULT_MAX_ATTEMPTS, policyIdentity, processingScope } = {}) {
  const bounded = scopeQuery(processingScope);
  const stale = new Date(now.getTime() - LOCK_TIMEOUT_MS);
  const recovery = await ProgressionOutbox.updateMany(
    { ...bounded, status: 'processing', lockedAt: { $lt: stale }, attempts: { $lt: maxAttempts } },
    { $set: { status: 'failed', lockedAt: null, availableAt: now, lastError: 'stale worker lease recovered' } }
  );
  workerState.staleLocksRecovered += recovery.modifiedCount || 0;
  const item = await ProgressionOutbox.findOneAndUpdate(
    { ...bounded, availableAt: { $lte: now }, attempts: { $lt: maxAttempts }, status: { $in: ['pending', 'failed'] } },
    { $set: { status: 'processing', lockedAt: now }, $inc: { attempts: 1 }, $unset: { lastError: 1 } },
    { sort: { createdAt: 1, eventId: 1 }, new: true }
  ).select('+event +evidence');
  if (!item) return null;
  const processingStartedAt = Date.now();
  try {
    const processedAt = new Date();
    let advancement = null;
    if (policyIdentity) {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          for (const evidence of item.evidence) await persistence.appendEvidence(evidence, { session });
          await persistence.appendEvent(item.event, { session });
          advancement = await persistence.advanceLiveEvent({ eventId: item.eventId, policyIdentity, session, rebuiltAt: processedAt });
          const acknowledgement = await ProgressionOutbox.updateOne({ _id: item._id, status: 'processing' }, { $set: { status: 'processed', processedAt, lockedAt: null } }, { session });
          if (acknowledgement.modifiedCount !== 1) throw new Error('PROGRESSION_OUTBOX_ACKNOWLEDGEMENT_CONFLICT');
        });
      } finally {
        await session.endSession();
      }
    } else {
      // Compatibility path for shadow-only tooling. The dedicated worker entrypoint
      // always supplies a persisted policy identity and cannot select this branch.
      for (const evidence of item.evidence) await persistence.appendEvidence(evidence);
      await persistence.appendEvent(item.event);
      await ProgressionOutbox.updateOne({ _id: item._id, status: 'processing' }, { $set: { status: 'processed', processedAt, lockedAt: null } });
    }
    const processingLatencyMs = Date.now() - processingStartedAt;
    observability.write('info', advancement ? 'progression_live_processed' : 'progression_shadow_processed', { eventId: item.eventId, decisionId: advancement?.decisionId || null, beneficiaryId: advancement?.beneficiaryId || null, factionId: advancement?.factionId || null, producer: item.event.provenance.producer, sourceType: item.event.sourceIdentity.objectType, attempts: item.attempts, processedAt: processedAt.toISOString(), processingLatencyMs });
    workerState.lastSuccessAt = processedAt; workerState.processed += 1; workerState.consecutiveFailures = 0;
    workerState.totalProcessingLatencyMs += processingLatencyMs; workerState.lastProcessingLatencyMs = processingLatencyMs; workerState.maxProcessingLatencyMs = Math.max(workerState.maxProcessingLatencyMs, processingLatencyMs);
    if (advancement) { workerState.decisions += 1; workerState.contributions += 1; workerState.personalProjections += 1; if (advancement.faction) workerState.factionProjections += 1; }
    return { eventId: item.eventId, status: 'processed', advancement };
  } catch (error) {
    const delay = Math.min(60_000, 1000 * (2 ** Math.min(item.attempts, 6)));
    await ProgressionOutbox.updateOne({ _id: item._id, status: 'processing' }, { $set: { status: 'failed', availableAt: new Date(Date.now() + delay), lockedAt: null, lastError: String(error.message || error).slice(0, 1000) } });
    observability.recordError('progression_shadow_processing_failure', error, { eventId: item.eventId, producer: item.event?.provenance?.producer || 'unknown', sourceType: item.event?.sourceIdentity?.objectType || 'unknown', attempts: item.attempts });
    workerState.lastFailureAt = new Date(); workerState.failures += 1; workerState.consecutiveFailures += 1;
    return { eventId: item.eventId, status: 'failed', error };
  }
}

async function processBatch({ batchSize = 25, concurrency = 2, ...options } = {}) {
  const boundedSize = Math.min(500, Math.max(1, Number.parseInt(batchSize, 10) || 25));
  const boundedConcurrency = Math.min(8, Math.max(1, Number.parseInt(concurrency, 10) || 2));
  const results = [];
  for (let offset = 0; offset < boundedSize; offset += boundedConcurrency) {
    const batch = await Promise.all(Array.from({ length: Math.min(boundedConcurrency, boundedSize - offset) }, () => processNext(options)));
    results.push(...batch.filter(Boolean));
    if (batch.some(value => value == null)) break;
  }
  return results;
}

async function operationalMetrics() {
  const [statuses, lastSuccess, classifications] = await Promise.all([
    ProgressionOutbox.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, attempts: { $sum: '$attempts' } } }]),
    ProgressionOutbox.findOne({ status: 'processed' }).sort({ processedAt: -1 }).select('processedAt').lean(),
    ProgressionOutbox.aggregate([{ $group: { _id: { producer: '$event.provenance.producer', sourceType: '$event.sourceIdentity.objectType' }, count: { $sum: 1 } } }, { $sort: { '_id.producer': 1, '_id.sourceType': 1 } }])
  ]);
  const byStatus = Object.fromEntries(statuses.map(row => [row._id, row.count]));
  return {
    pending: byStatus.pending || 0,
    processing: byStatus.processing || 0,
    processed: byStatus.processed || 0,
    failed: byStatus.failed || 0,
    retrying: byStatus.failed || 0,
    retries: statuses.reduce((total, row) => total + Math.max(0, row.attempts - row.count), 0),
    lastSuccessfulProcessingTime: lastSuccess?.processedAt?.toISOString() || null,
    sources: classifications.map(row => ({ producer: row._id.producer, sourceType: row._id.sourceType, count: row.count })),
    worker: healthStatus()
  };
}

async function rebuildShadowProjection(args) {
  try { return await persistence.rebuildProjection(args); }
  catch (error) {
    observability.recordError('progression_shadow_rebuild_failure', error, { projectionContextId: args?.projectionContext?.projectionContextId || 'unknown' });
    throw error;
  }
}

function startShadowWorker({ intervalMs = 1000, batchSize = 25, concurrency = 2, maxAttempts = DEFAULT_MAX_ATTEMPTS, policyIdentity, processingScope, onError = console.error } = {}) {
  let stopped = false; let running = false;
  workerState.startedAt = new Date(); workerState.stoppedAt = null;
  const tick = async () => {
    if (stopped || running) return;
    running = true;
    try { await processBatch({ batchSize, concurrency, maxAttempts, policyIdentity, processingScope }); } catch (error) { workerState.lastFailureAt = new Date(); onError(error); } finally { running = false; }
  };
  const timer = setInterval(tick, Math.max(250, intervalMs));
  timer.unref?.();
  setImmediate(tick);
  return async () => {
    stopped = true; clearInterval(timer);
    const deadline = Date.now() + 30_000;
    while (running && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 25));
    workerState.stoppedAt = new Date();
  };
}

function healthStatus() {
  const elapsedSeconds = workerState.startedAt ? Math.max(1, (Date.now() - workerState.startedAt.getTime()) / 1000) : 0;
  return {
    running: Boolean(workerState.startedAt && !workerState.stoppedAt),
    startedAt: workerState.startedAt?.toISOString() || null,
    lastSuccessfulProcessingTime: workerState.lastSuccessAt?.toISOString() || null,
    lastFailure: workerState.lastFailureAt?.toISOString() || null,
    processingRatePerSecond: elapsedSeconds ? Math.round(workerState.processed / elapsedSeconds * 1000) / 1000 : 0,
    retryRate: workerState.processed + workerState.failures ? Math.round(workerState.failures / (workerState.processed + workerState.failures) * 10000) / 10000 : 0,
    liveEffects: { events: workerState.processed, decisions: workerState.decisions, contributions: workerState.contributions, personalProjections: workerState.personalProjections, factionProjections: workerState.factionProjections },
    processingLatencyMs: { last: workerState.lastProcessingLatencyMs, average: workerState.processed ? Math.round(workerState.totalProcessingLatencyMs / workerState.processed) : null, max: workerState.processed ? workerState.maxProcessingLatencyMs : null },
    consecutiveFailures: workerState.consecutiveFailures,
    staleLockRecoveryCount: workerState.staleLocksRecovered
  };
}

module.exports = Object.freeze({ processNext, processBatch, startShadowWorker, operationalMetrics, rebuildShadowProjection, healthStatus, LOCK_TIMEOUT_MS, DEFAULT_MAX_ATTEMPTS });
