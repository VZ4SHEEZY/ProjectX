'use strict';

const mongoose = require('mongoose');
const Post = require('../../models/Post');
const ProgressionOutbox = require('../../models/ProgressionOutbox');
const ProgressionOperation = require('../../models/ProgressionOperation');
const { produceActivity } = require('../runtime/event-producer');

const DEFAULT_BATCH_SIZE = 100;

function boundedBatchSize(value) {
  const parsed = Number.parseInt(value || DEFAULT_BATCH_SIZE, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 500) throw new TypeError('batch size must be between 1 and 500');
  return parsed;
}

async function preflight() {
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  const transactionCapable = Boolean(hello.setName || hello.msg === 'isdbgrid');
  return {
    transactionCapable,
    eligiblePublishedPosts: await Post.countDocuments({ status: 'published', isPublished: { $ne: false } }),
    sources: [{ source: 'posts', action: 'creation.published', backfillable: true }],
    excluded: [
      'likes and views (legacy arrays/counters have no authoritative occurrence timestamps)',
      'comments and relationships (current state cannot prove removed historical transitions)',
      'tips without independently persisted finality evidence',
      'creator state without an authoritative approval transition timestamp'
    ]
  };
}

async function runBatch({ operationKey, batchSize = DEFAULT_BATCH_SIZE, dryRun = false } = {}) {
  if (!operationKey || operationKey.length > 200) throw new TypeError('bounded operationKey is required');
  const limit = boundedBatchSize(batchSize);
  const operation = await ProgressionOperation.findOneAndUpdate(
    { operationKey },
    { $setOnInsert: { kind: 'backfill', scope: 'global', dryRun, status: 'pending', stats: { scanned: 0, enqueued: 0, existing: 0 } } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  if (operation.kind !== 'backfill' || operation.dryRun !== dryRun) throw new Error('BACKFILL_OPERATION_IDENTITY_MISMATCH');
  if (operation.status === 'complete') return { complete: true, operation };

  const query = { status: 'published', isPublished: { $ne: false } };
  if (operation.cursor) query._id = { $gt: operation.cursor };
  const posts = await Post.find(query).sort({ _id: 1 }).limit(limit).select('_id author createdAt').lean();
  const delta = { scanned: posts.length, enqueued: 0, existing: 0 };

  for (const post of posts) {
    const payload = await produceActivity({
      principal: 'user', eventType: 'creation.published', activityClass: 'CREATE', actorId: post.author, beneficiaryId: post.author,
      occurredAt: post.createdAt, subject: { type: 'user', id: String(post.author) }, object: { type: 'post', id: String(post._id) },
      source: { objectType: 'post', objectId: post._id, transition: 'created', version: '1' }
    });
    if (await ProgressionOutbox.exists({ eventId: payload.event.eventId })) { delta.existing += 1; continue; }
    if (!dryRun) {
      try { await ProgressionOutbox.create({ eventId: payload.event.eventId, event: payload.event, evidence: payload.evidence }); delta.enqueued += 1; }
      catch (error) { if (error?.code === 11000) delta.existing += 1; else throw error; }
    } else delta.enqueued += 1;
  }

  const complete = posts.length < limit;
  const cursor = posts.at(-1)?._id?.toString() || operation.cursor;
  const updated = await ProgressionOperation.findOneAndUpdate({ _id: operation._id }, {
    $set: { status: complete ? 'complete' : 'pending', cursor, lastHeartbeatAt: new Date(), ...(complete ? { lastSuccessAt: new Date() } : {}) },
    $inc: { 'stats.scanned': delta.scanned, 'stats.enqueued': delta.enqueued, 'stats.existing': delta.existing }
  }, { new: true });
  return { complete, delta, operation: updated };
}

module.exports = Object.freeze({ DEFAULT_BATCH_SIZE, boundedBatchSize, preflight, runBatch });
