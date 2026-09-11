const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.QA_E2E_SECRET = 'qa-route-test-secret';

const User = require('../models/User');
const Post = require('../models/Post');
const Profile = require('../models/Profile');
const Faction = require('../models/Faction');
const FactionMembership = require('../models/FactionMembership');
const qaRouter = require('../routes/qa');

const secret = { 'x-qa-e2e-secret': process.env.QA_E2E_SECRET };
let mongo;

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/qa', qaRouter);
  app.use((error, req, res, next) => res.status(error.status || 500).json({ error: 'controlled' }));
  return app;
};

test.before(async () => {
  mongo = await MongoMemoryServer.create({ binary: { version: '7.0.14' } });
  await mongoose.connect(mongo.getUri());
  await Promise.all([User.syncIndexes(), Faction.syncIndexes()]);
});

test.after(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

test.beforeEach(async () => {
  await mongoose.connection.dropDatabase();
  await Promise.all([User.syncIndexes(), Faction.syncIndexes()]);
});

test('existing canonical faction is reused without duplicate creation or mutation', async () => {
  const existing = await Faction.create({ key: 'neon_wraith', name: 'Neon Wraith', color: '#123456', status: 'retired', founding: false });

  const resolved = await qaRouter.findOrCreateFaction('Neon Wraith');

  assert.equal(resolved._id.toString(), existing._id.toString());
  assert.equal(await Faction.countDocuments({ name: 'Neon Wraith' }), 1);
  const unchanged = await Faction.findById(existing._id).lean();
  assert.equal(unchanged.color, '#123456');
  assert.equal(unchanged.status, 'retired');
  assert.equal(unchanged.founding, false);
});

test('seed succeeds with canonical factions and preserves affiliated and unaffiliated identity', async () => {
  const neon = await Faction.create({ key: 'neon_wraith', name: 'Neon Wraith', color: '#abcdef' });

  const response = await request(buildApp()).post('/api/qa/seed').set(secret).send({ runId: 'canonical' });

  assert.equal(response.status, 201);
  assert.equal((await Faction.findOne({ name: 'Neon Wraith' }))._id.toString(), neon._id.toString());
  const affiliated = await User.findOne({ username: 'qa_canonical_faction01' });
  const membership = await FactionMembership.findOne({ user: affiliated._id });
  assert.equal(membership.faction.toString(), neon._id.toString());
  const unaffiliated = await User.findOne({ username: response.body.certification.unaffiliated.username });
  assert.equal(unaffiliated.faction, 'Unaffiliated');
  assert.equal(await FactionMembership.exists({ user: unaffiliated._id }), null);
});

test('seed failures return a controlled HTTP error through Express', async () => {
  const originalCreate = Profile.create;
  Profile.create = async () => { throw new Error('injected seed failure'); };
  try {
    const response = await request(buildApp()).post('/api/qa/seed').set(secret).send({ runId: 'failure' });
    assert.equal(response.status, 500);
    assert.deepEqual(response.body, { error: 'controlled' });
  } finally {
    Profile.create = originalCreate;
  }
});

test('cleanup deletes only QA-marked accounts and their data', async () => {
  const qaUser = await User.create({ username: 'qa_cleanup_primary', email: 'qa_cleanup@example.invalid', password: 'password', isQaAccount: true, isAgeVerified: true });
  const realUser = await User.create({ username: 'real_cleanup_user', email: 'real@example.test', password: 'password' });
  const qaPost = await Post.create({ author: qaUser._id, type: 'text', status: 'published', description: 'qa' });
  const realPost = await Post.create({ author: realUser._id, type: 'text', status: 'published', description: 'real' });

  const response = await request(buildApp()).delete('/api/qa/accounts/cleanup').set(secret);

  assert.equal(response.status, 200);
  assert.equal(response.body.deletedUsers, 1);
  assert.equal(await User.exists({ _id: qaUser._id }), null);
  assert.equal(await Post.exists({ _id: qaPost._id }), null);
  assert.ok(await User.exists({ _id: realUser._id }));
  assert.ok(await Post.exists({ _id: realPost._id }));
});

test('production mode cannot mount the QA route', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  assert.match(source, /QA_E2E_ENABLED === 'true' && process\.env\.NODE_ENV !== 'production'/);
});
