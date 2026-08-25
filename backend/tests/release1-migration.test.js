const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const User = require('../models/User');
const Follow = require('../models/Follow');
const Profile = require('../models/Profile');
const TopFriend = require('../models/TopFriend');
const { buildPreflight, applyMigration, rollbackMigration } = require('../migrations/002-release-1a-foundation');

let mongo;
const manifests = [];
async function clear() { await mongoose.connection.dropDatabase(); }
async function seed() {
  const ids = Array.from({ length: 35 }, () => new mongoose.Types.ObjectId());
  const users = Array.from({ length: 27 }, (_, i) => ({ _id: ids[i], username: `migration${i}`, email: `migration${i}@example.test`, password: 'not-a-real-secret', faction: i < 23 ? 'Neon Wraith' : 'Unaffiliated', isCreator: i < 6, creatorStatus: i < 6 ? 'approved' : 'none', following: [] }));
  for (let i = 0; i < 14; i++) users[i].following.push(ids[(i + 1) % 27]);
  users[0].following.push(ids[1]); // canonical duplicate
  for (let i = 0; i < 8; i++) users[i].following.push(ids[27 + i]);
  await User.collection.insertMany(users);
  return { users, ids };
}
function opts(id) { const manifestPath = path.join(os.tmpdir(), `${id}.json`); manifests.push(manifestPath); return { migrationRunId: id, manifestPath }; }

test.before(async () => { mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 }, binary: { version: '7.0.14' } }); await mongoose.connect(mongo.getUri()); });
test.after(async () => { await mongoose.disconnect(); await mongo.stop(); for (const file of manifests) fs.rmSync(file, { force: true }); });
test.beforeEach(clear);

test('clean migration filters dangling and duplicate follows and writes a private manifest', async () => {
  await seed(); const pre = await buildPreflight();
  assert.equal(pre.report.validFollows, 14); assert.equal(pre.report.rejectedDanglingFollows, 8); assert.equal(pre.report.projectedTotalInserts, 312); assert.equal(pre.report.topFriendsToCreate, 0);
  const options = opts('release1_clean'); const result = await applyMigration(options);
  assert.equal(result.inserted, 312); assert.equal(await Follow.countDocuments(), 14); assert.equal(await TopFriend.countDocuments(), 0);
  const manifest = JSON.parse(fs.readFileSync(options.manifestPath)); assert.equal(manifest.records.length, 312); assert.deepEqual(Object.keys(manifest.records[0]).sort(), ['collection','id']);
  assert.equal(await Profile.countDocuments({ migrationRunId: options.migrationRunId, sourceLegacyId: { $exists: true } }), 27);
});

test('rerun is idempotent and uses no new provenance', async () => {
  await seed(); await applyMigration(opts('release1_first'));
  const second = await applyMigration(opts('release1_second'));
  assert.equal(second.inserted, 0); assert.equal(await Profile.countDocuments(), 27); assert.equal(await Follow.countDocuments(), 14);
});

test('partial failure rolls the transaction back completely', async () => {
  await seed(); await assert.rejects(applyMigration({ ...opts('release1_failure'), failAfter: 20 }), /Injected/);
  assert.equal(await Profile.countDocuments(), 0); assert.equal(await Follow.countDocuments(), 0);
});

test('conflicting non-unique index aborts before inserts', async () => {
  await seed(); await Profile.collection.createIndex({ user: 1 }, { name: 'user_1' });
  await assert.rejects(applyMigration(opts('release1_badindex')), /Index or rollback preflight failed/);
  assert.equal(await Profile.countDocuments(), 0);
});

test('rollback is scoped, supports dry-run, and migration can run again', async () => {
  await seed(); await applyMigration(opts('release1_rollback'));
  const dry = await rollbackMigration({ migrationRunId: 'release1_rollback', dryRun: true }); assert.equal(dry.recordsMatched, 312); assert.equal(await Profile.countDocuments(), 27);
  await rollbackMigration({ migrationRunId: 'release1_rollback', dryRun: false }); assert.equal(await Profile.countDocuments(), 0); assert.equal(await Follow.countDocuments(), 0);
  await assert.rejects(rollbackMigration({ migrationRunId: '', dryRun: false }), /non-ambiguous/);
  const again = await applyMigration(opts('release1_again')); assert.equal(again.inserted, 312);
});
