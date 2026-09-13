'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const User = require('../models/User');
const Post = require('../models/Post');
const Faction = require('../models/Faction');
const Membership = require('../models/FactionMembership');
const Outbox = require('../models/ProgressionOutbox');
const Operation = require('../models/ProgressionOperation');
const backfill = require('../progression/operations/backfill');
const remediation = require('../progression/operations/outbox-remediation');
const { validateEvent } = require('../progression/contracts');

let mongo;
test.before(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 }, binary: { version: '7.0.14' } });
  await mongoose.connect(mongo.getUri(), { autoIndex: true, autoCreate: true });
});
test.after(async () => { await mongoose.disconnect(); await mongo.stop(); });

test('exact malformed outbox remediation is atomic, contract-valid, and repeat-safe', async () => {
  const faction = await Faction.create({ key: 'chrome', name: 'Chrome' });
  const users = [];
  for (let index = 0; index < 11; index += 1) {
    const user = await User.create({ username: `repair_${index}`, email: `repair_${index}@example.com`, password: 'test-hash' });
    users.push(user);
    if (index < 7) await Membership.create({ user: user._id, faction: faction._id, joinedAt: new Date('2025-01-01T00:00:00Z') });
    await Post.create({ author: user._id, type: 'text', content: `post ${index}`, status: 'published', createdAt: new Date(`2026-01-${String(index + 1).padStart(2, '0')}T00:00:00Z`) });
  }
  let result;
  do { result = await backfill.runBatch({ operationKey: remediation.GATE_5B_KEY, dryRun: false, batchSize: 20 }); } while (!result.complete);
  await mongoose.connection.db.collection('progression_outbox').updateMany({}, { $unset: { 'event.facts': '' } });
  const generated = await remediation.candidates();
  const reviewed = [];
  for (const item of generated) {
    reviewed.push({ postId: item.event.object.id, subjectId: item.event.actorId, authorExists: true, authorQaLike: false,
      eventType: item.event.eventType, occurredAt: item.event.occurredAt, affiliation: item.event.affiliations.actor,
      producer: item.event.provenance.producer, authority: item.event.provenance.authority, eventId: item.eventId,
      idempotencyKey: item.event.idempotencyKey, eligible: true, exclusionReason: null });
  }
  const expectedDigest = remediation.digest(reviewed);
  const first = await remediation.apply({ operationKey: 'repair-exact-11', expectedDigest });
  assert.equal(first.outcome, 'replaced');
  assert.equal(first.audit.valid.length, 11);
  const raw = await mongoose.connection.db.collection('progression_outbox').find({}).toArray();
  assert.equal(raw.length, 11);
  for (const row of raw) { assert.ok(Object.hasOwn(row.event, 'facts')); assert.deepEqual(row.event.facts, {}); assert.equal(validateEvent(row.event), true); }
  const second = await remediation.apply({ operationKey: 'repair-exact-11', expectedDigest });
  assert.equal(second.outcome, 'already-complete');
  assert.equal(await Outbox.countDocuments(), 11);
  assert.equal(await Operation.countDocuments({ operationKey: 'repair-exact-11' }), 1);
});
