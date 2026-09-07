'use strict';

const User = require('../../models/User');
const ProgressionOperation = require('../../models/ProgressionOperation');
const persistence = require('../persistence/service');
const observability = require('../../services/observability');

async function runUser({ userId, policyIdentity, operationKey = `release-3e-rebuild-user:${userId}` } = {}) {
  if (!userId || String(userId).length > 256) throw new TypeError('bounded userId is required');
  const started = Date.now();
  const operation = await claim({ operationKey, scope: 'user', subjectId: String(userId), policyIdentity });
  if (!operation) return { skipped: true };
  try {
    const result = await persistence.rebuildSubjectProjection({ userId: String(userId), policyIdentity });
    await complete(operation._id, started, { rebuilt: result.personal ? 1 : 0 });
    return { skipped: false, available: Boolean(result.personal) };
  } catch (error) {
    await fail(operation._id, error, started); throw error;
  }
}

async function runGlobalBatch({ operationKey, policyIdentity, batchSize = 25, concurrency = 2, maxFailureRetries = 3 } = {}) {
  const limit = Math.min(250, Math.max(1, Number.parseInt(batchSize, 10) || 25));
  const parallelism = Math.min(8, Math.max(1, Number.parseInt(concurrency, 10) || 2));
  const operation = await ProgressionOperation.findOneAndUpdate(
    { operationKey },
    { $setOnInsert: { kind: 'rebuild', scope: 'global', status: 'pending', policyIdentity, stats: { scanned: 0, rebuilt: 0, failed: 0 } } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  if (JSON.stringify(operation.policyIdentity) !== JSON.stringify(policyIdentity)) throw new Error('REBUILD_POLICY_IDENTITY_MISMATCH');
  if (operation.status === 'complete') return { complete: true, operation };
  const priorFailures = operation.checkpoint?.failedSubjectIds || [];
  const retrying = operation.checkpoint?.scanComplete === true && priorFailures.length > 0;
  const retryIds = retrying ? priorFailures.slice(0, limit) : [];
  const query = retrying ? { _id: { $in: retryIds }, isActive: { $ne: false } } : { isActive: { $ne: false }, ...(operation.cursor ? { _id: { $gt: operation.cursor } } : {}) };
  const users = await User.find(query).sort({ _id: 1 }).limit(limit).select('_id').lean();
  const delta = { scanned: users.length, rebuilt: 0, failed: 0 };
  const failedSubjectIds = [];
  for (let offset = 0; offset < users.length; offset += parallelism) {
    await Promise.all(users.slice(offset, offset + parallelism).map(async user => {
      try { const result = await persistence.rebuildSubjectProjection({ userId: String(user._id), policyIdentity }); if (result.personal) delta.rebuilt += 1; }
      catch (error) { delta.failed += 1; failedSubjectIds.push(String(user._id)); observability.recordError('progression_user_rebuild_failure', error, { userId: String(user._id), operationKey }); }
    }));
  }
  const remainingFailures = retrying ? [...priorFailures.slice(limit), ...failedSubjectIds] : [...priorFailures, ...failedSubjectIds];
  const doneScanning = retrying ? true : users.length < limit;
  const done = doneScanning && remainingFailures.length === 0;
  const retryRound = retrying ? Number(operation.checkpoint?.retryRound || 0) + 1 : 0;
  const retriesExhausted = doneScanning && remainingFailures.length > 0 && retryRound >= Math.min(10, Math.max(1, Number.parseInt(maxFailureRetries, 10) || 3));
  const updated = await ProgressionOperation.findOneAndUpdate({ _id: operation._id }, {
    $set: { status: done ? 'complete' : retriesExhausted ? 'failed' : 'pending', cursor: retrying ? operation.cursor : (users.at(-1)?._id?.toString() || operation.cursor), checkpoint: { failedSubjectIds: remainingFailures, scanComplete: doneScanning, retryRound }, lastHeartbeatAt: new Date(), ...(done ? { lastSuccessAt: new Date() } : {}), ...(retriesExhausted ? { lastError: `${remainingFailures.length} subject rebuild(s) exhausted retry budget` } : {}) },
    $inc: { 'stats.scanned': delta.scanned, 'stats.rebuilt': delta.rebuilt, 'stats.failed': delta.failed }
  }, { new: true });
  return { complete: done || retriesExhausted, succeeded: done, delta, operation: updated };
}

async function claim({ operationKey, scope, subjectId, policyIdentity }) {
  const stale = new Date(Date.now() - 15 * 60 * 1000);
  await ProgressionOperation.updateOne({ operationKey, status: 'running', lockedAt: { $lt: stale } }, { $set: { status: 'pending', lockedAt: null } });
  await ProgressionOperation.updateOne({ operationKey }, { $setOnInsert: { kind: 'rebuild', scope, subjectId, policyIdentity, status: 'pending' } }, { upsert: true });
  return ProgressionOperation.findOneAndUpdate({ operationKey, status: { $in: ['pending', 'failed'] } }, { $set: { status: 'running', lockedAt: new Date(), lastHeartbeatAt: new Date(), lastError: null } }, { new: true });
}
async function complete(id, started, stats) { return ProgressionOperation.updateOne({ _id: id }, { $set: { status: 'complete', lockedAt: null, lastSuccessAt: new Date(), durationMs: Date.now() - started, stats } }); }
async function fail(id, error, started) { return ProgressionOperation.updateOne({ _id: id }, { $set: { status: 'failed', lockedAt: null, durationMs: Date.now() - started, lastError: String(error.message || error).slice(0, 1000) } }); }

module.exports = Object.freeze({ runUser, runGlobalBatch });
