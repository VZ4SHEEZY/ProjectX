'use strict';

const crypto = require('node:crypto');
const mongoose = require('mongoose');
const Post = require('../../models/Post');
const User = require('../../models/User');
const ProgressionOutbox = require('../../models/ProgressionOutbox');
const ProgressionOperation = require('../../models/ProgressionOperation');
const { produceActivity } = require('../runtime/event-producer');
const { stableJson, validateEvent } = require('../contracts');

const EXPECTED_COUNT = 11;
const GATE_5B_KEY = 'prod-release3e-posts-apply-20260912-gate5b-v1';

function digest(candidates) {
  return `sha256:${crypto.createHash('sha256').update(JSON.stringify(candidates)).digest('hex')}`;
}

async function candidates() {
  const posts = await Post.find({ status: 'published', isPublished: { $ne: false } })
    .sort({ _id: 1 }).select('_id author createdAt').lean();
  const result = [];
  for (const post of posts) {
    const payload = await produceActivity({
      principal: 'user', eventType: 'creation.published', activityClass: 'CREATE', actorId: post.author,
      beneficiaryId: post.author, occurredAt: post.createdAt, subject: { type: 'user', id: String(post.author) },
      object: { type: 'post', id: String(post._id) },
      source: { objectType: 'post', objectId: post._id, transition: 'created', version: '1' }
    });
    result.push({ eventId: payload.event.eventId, event: payload.event, evidence: payload.evidence });
  }
  return result;
}

function validCandidate(row, candidate) {
  try { validateEvent(row.event); } catch { return false; }
  return row.eventId === candidate.eventId
    && stableJson(row.event) === stableJson(candidate.event)
    && stableJson(row.evidence || []) === stableJson(candidate.evidence || []);
}

async function audit({ expectedDigest }) {
  const generated = await candidates();
  const reviewed = [];
  for (const item of generated) {
    const user = await User.findById(item.event.actorId).select('_id username').lean();
    reviewed.push({
      postId: item.event.object.id, subjectId: item.event.actorId, authorExists: Boolean(user),
      authorQaLike: /^(qa|test|staging)[-_]/i.test(user?.username || ''), eventType: item.event.eventType,
      occurredAt: item.event.occurredAt, affiliation: item.event.affiliations.actor,
      producer: item.event.provenance.producer, authority: item.event.provenance.authority,
      eventId: item.eventId, idempotencyKey: item.event.idempotencyKey,
      eligible: Boolean(user && item.event.occurredAt), exclusionReason: user ? null : 'missing author'
    });
  }
  const candidateDigest = digest(reviewed);
  if (generated.length !== EXPECTED_COUNT) throw new Error(`REMEDIATION_SCOPE_MISMATCH:candidates:${generated.length}`);
  if (candidateDigest !== expectedDigest) throw new Error(`REMEDIATION_CANDIDATE_DIGEST_MISMATCH:${candidateDigest}`);
  const ids = generated.map(item => item.eventId);
  if (new Set(ids).size !== EXPECTED_COUNT) throw new Error('REMEDIATION_DUPLICATE_EVENT_IDENTITIES');
  if (new Set(generated.map(item => item.event.idempotencyKey)).size !== EXPECTED_COUNT) throw new Error('REMEDIATION_DUPLICATE_DEDUPE_IDENTITIES');
  if (reviewed.some(item => !item.eligible || item.authorQaLike)) throw new Error('REMEDIATION_REVIEWED_CANDIDATE_ELIGIBILITY_MISMATCH');

  const rows = await ProgressionOutbox.find({ eventId: { $in: ids } }).select('+event +evidence').lean();
  const byId = new Map(rows.map(row => [row.eventId, row]));
  const valid = generated.filter(item => byId.has(item.eventId) && validCandidate(byId.get(item.eventId), item));
  const malformed = generated.filter(item => {
    const row = byId.get(item.eventId);
    return row && row.status === 'pending' && row.attempts === 0 && row.processedAt == null && !validCandidate(row, item);
  });
  const allRows = await ProgressionOutbox.find({}).select('+event +evidence').lean();
  const unrelatedMalformed = allRows.filter(row => {
    try { validateEvent(row.event); return false; } catch { return !ids.includes(row.eventId); }
  });
  const status = Object.fromEntries(['pending', 'processing', 'processed', 'failed'].map(value => [value, allRows.filter(row => row.status === value).length]));
  const gate5b = await ProgressionOperation.findOne({ operationKey: GATE_5B_KEY }).lean();
  const collections = mongoose.connection.db;
  const downstream = {};
  for (const [name, collection] of Object.entries({ activityEvents: 'progression_activity_events', evidence: 'progression_evidence', decisions: 'progression_qualification_decisions', contributions: 'progression_contribution_results', projections: 'progression_projections' })) {
    downstream[name] = await collections.collection(collection).countDocuments({});
  }
  return { generated, candidateDigest, rows, valid, malformed, unrelatedMalformed, status, gate5b, downstream,
    unaffiliated: generated.filter(item => item.event.affiliations.actor.state === 'unaffiliated').length };
}

function assertPreRepairScope(result) {
  if (result.rows.length !== EXPECTED_COUNT || result.malformed.length !== EXPECTED_COUNT || result.valid.length !== 0) throw new Error('REMEDIATION_SCOPE_MISMATCH:expected_exact_11_malformed');
  if (result.unrelatedMalformed.length) throw new Error(`REMEDIATION_SCOPE_MISMATCH:unrelated_malformed:${result.unrelatedMalformed.length}`);
  if (result.unaffiliated !== 4) throw new Error(`REMEDIATION_FACTION_SCOPE_MISMATCH:unaffiliated:${result.unaffiliated}`);
  if (stableJson(result.status) !== stableJson({ pending: 11, processing: 0, processed: 0, failed: 0 })) throw new Error(`REMEDIATION_STATE_MISMATCH:${stableJson(result.status)}`);
  if (!result.gate5b || result.gate5b.status !== 'complete' || result.gate5b.dryRun !== false || Number(result.gate5b.stats?.enqueued) !== 11) throw new Error('REMEDIATION_GATE_5B_IDENTITY_MISMATCH');
  if (Object.values(result.downstream).some(Boolean)) throw new Error(`REMEDIATION_DOWNSTREAM_NOT_EMPTY:${stableJson(result.downstream)}`);
}

async function apply({ operationKey, expectedDigest }) {
  if (!operationKey || operationKey.length > 200) throw new TypeError('bounded operationKey is required');
  const before = await audit({ expectedDigest });
  const prior = await ProgressionOperation.findOne({ operationKey }).lean();
  if (prior) {
    if (prior.kind !== 'outbox_remediation' || prior.checkpoint?.candidateDigest !== expectedDigest) throw new Error('REMEDIATION_OPERATION_IDENTITY_MISMATCH');
    if (prior.status !== 'complete') throw new Error('REMEDIATION_OPERATION_INCOMPLETE');
    if (before.valid.length !== EXPECTED_COUNT || before.malformed.length !== 0) throw new Error('REMEDIATION_COMPLETED_STATE_MISMATCH');
    return { outcome: 'already-complete', audit: before, operation: prior };
  }
  assertPreRepairScope(before);
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const operation = (await ProgressionOperation.create([{
        operationKey, kind: 'outbox_remediation', scope: 'global', status: 'running', dryRun: false,
        checkpoint: { candidateDigest: expectedDigest, sourceOperationKey: GATE_5B_KEY, expectedCount: EXPECTED_COUNT },
        stats: { replaced: 0 }
      }], { session }))[0];
      const ids = before.generated.map(item => item.eventId);
      const removed = await ProgressionOutbox.deleteMany({ eventId: { $in: ids }, status: 'pending', attempts: 0, processedAt: null, 'event.facts': { $exists: false } }, { session });
      if (removed.deletedCount !== EXPECTED_COUNT) throw new Error(`REMEDIATION_DELETE_SCOPE_MISMATCH:${removed.deletedCount}`);
      await ProgressionOutbox.create(before.generated, { session, ordered: true });
      await ProgressionOperation.updateOne({ _id: operation._id, status: 'running' }, {
        $set: { status: 'complete', lastHeartbeatAt: new Date(), lastSuccessAt: new Date(), 'stats.replaced': EXPECTED_COUNT }
      }, { session });
    });
  } finally { await session.endSession(); }
  const after = await audit({ expectedDigest });
  if (after.valid.length !== EXPECTED_COUNT || after.malformed.length !== 0 || after.rows.length !== EXPECTED_COUNT) throw new Error('REMEDIATION_POSTCONDITION_FAILED');
  return { outcome: 'replaced', audit: after, operation: await ProgressionOperation.findOne({ operationKey }).lean() };
}

module.exports = Object.freeze({ EXPECTED_COUNT, GATE_5B_KEY, digest, candidates, audit, assertPreRepairScope, apply });
