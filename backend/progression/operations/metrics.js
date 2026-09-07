'use strict';

const User = require('../../models/User');
const Outbox = require('../../models/ProgressionOutbox');
const Projection = require('../../models/ProgressionProjection');
const Operation = require('../../models/ProgressionOperation');
const { freshnessPolicy } = require('../product/config');
const { healthStatus } = require('../runtime/worker');

async function snapshot(now = new Date()) {
  const staleBefore = new Date(now.getTime() - freshnessPolicy().staleAfterMs);
  const [outboxRows, oldest, lastProcessed, totalUsers, availableUsers, staleUsers, operations] = await Promise.all([
    Outbox.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, attempts: { $sum: '$attempts' } } }]),
    Outbox.findOne({ status: { $in: ['pending', 'failed'] } }).sort({ createdAt: 1 }).select('createdAt').lean(),
    Outbox.findOne({ status: 'processed' }).sort({ processedAt: -1 }).select('processedAt').lean(),
    User.countDocuments({ isActive: { $ne: false } }),
    Projection.distinct('subjectId', { scope: 'personal' }),
    Projection.distinct('subjectId', { scope: 'personal', rebuiltAt: { $lt: staleBefore } }),
    Operation.find({}).sort({ updatedAt: -1 }).limit(50).lean()
  ]);
  const byStatus = Object.fromEntries(outboxRows.map(row => [row._id, row]));
  const latestByKind = kind => operations.find(item => item.kind === kind);
  const rebuild = latestByKind('rebuild'); const backfill = latestByKind('backfill');
  return {
    generatedAt: now.toISOString(),
    outbox: {
      pending: byStatus.pending?.count || 0, processing: byStatus.processing?.count || 0,
      processed: byStatus.processed?.count || 0, failed: byStatus.failed?.count || 0,
      retrying: outboxRows.reduce((sum, row) => sum + Math.max(0, row.attempts - row.count), 0),
      oldestPendingAgeSeconds: oldest ? Math.max(0, Math.floor((now - oldest.createdAt) / 1000)) : null
    },
    worker: { ...healthStatus(), lastSuccessfulProcessingTime: lastProcessed?.processedAt?.toISOString() || healthStatus().lastSuccessfulProcessingTime },
    projections: {
      availableProjectionCount: availableUsers.length,
      unavailableProjectionCount: Math.max(0, totalUsers - availableUsers.length),
      staleProjectionCount: staleUsers.length,
      lastSuccessfulRebuild: rebuild?.lastSuccessAt?.toISOString?.() || null,
      rebuildFailures: operations.filter(item => item.kind === 'rebuild' && item.status === 'failed').length,
      rebuildDurationMs: rebuild?.durationMs || null,
      checkpoint: rebuild ? { operationKey: rebuild.operationKey, status: rebuild.status, cursor: rebuild.cursor, stats: rebuild.stats, lastHeartbeatAt: rebuild.lastHeartbeatAt?.toISOString?.() || null } : null
    },
    backfill: backfill ? { operationKey: backfill.operationKey, status: backfill.status, cursor: backfill.cursor, stats: backfill.stats, lastError: backfill.lastError, lastHeartbeatAt: backfill.lastHeartbeatAt?.toISOString?.() || null, completionStatus: backfill.status === 'complete' ? 'complete' : 'incomplete' } : null
  };
}

module.exports = Object.freeze({ snapshot });
