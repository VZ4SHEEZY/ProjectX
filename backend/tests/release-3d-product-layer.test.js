'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../models/User');
const Faction = require('../models/Faction');
const FactionMembership = require('../models/FactionMembership');
const Creator = require('../models/Creator');
const Follow = require('../models/Follow');
const Friendship = require('../models/Friendship');
const Block = require('../models/Block');
const Projection = require('../models/ProgressionProjection');
const progressionRoutes = require('../routes/progression');
const { resolveLevel, resolveUnlocks, publicDimensions, getUserProgression } = require('../progression/product/read-service');

let mongo;
let viewer;
let member;
let unaffiliated;
let pendingProjection;
let token;
const originalFlag = process.env.USER_FACING_PROGRESSION_ENABLED;
const originalFrontendFlag = process.env.VITE_USER_FACING_PROGRESSION_ENABLED;

const app = express();
app.use(express.json());
app.use('/api/progression', progressionRoutes);
app.use((error, req, res, next) => res.status(500).json({ message: error.message }));

test.before(async () => {
  mongo = await MongoMemoryServer.create({ binary: { version: '7.0.14' } });
  await mongoose.connect(mongo.getUri());
  process.env.JWT_SECRET = 'release-3d-test-secret-release-3d';
  [viewer, member, unaffiliated, pendingProjection] = await User.create([
    { username: 'viewer_3d', email: 'viewer3d@example.com', password: 'test-hash', isAgeVerified: true },
    { username: 'member_3d', email: 'member3d@example.com', password: 'test-hash', isCreator: true },
    { username: 'vz4sheezy', email: 'vz3d@example.com', password: 'test-hash', faction: 'Unaffiliated' },
    { username: 'pending_3d', email: 'pending3d@example.com', password: 'test-hash' }
  ]);
  const faction = await Faction.create({ key: 'neon-test', name: 'Neon Test', color: '#39FF14' });
  await Promise.all([
    FactionMembership.create({ user: member._id, faction: faction._id, status: 'active' }),
    Creator.create({ user: member._id, state: 'active' }),
    projection('personal', member._id, { level: 12, band: 'Established', contribution: 1000, specialties: { creation: 10, social: 7, creator: 12, economy: 2 }, crossFactionInfluence: 4 }),
    projection('personal', unaffiliated._id, { level: 3, band: 'Initiation', contribution: 32, specialties: { creation: 4, social: 1 }, crossFactionInfluence: 0 }),
    projection('faction', 'neon-test', { total: 50, contributors: { [String(member._id)]: 18.5 } })
  ]);
  token = jwt.sign({ userId: viewer._id }, process.env.JWT_SECRET, { algorithm: 'HS256' });
});

test.after(async () => {
  if (originalFlag == null) delete process.env.USER_FACING_PROGRESSION_ENABLED;
  else process.env.USER_FACING_PROGRESSION_ENABLED = originalFlag;
  if (originalFrontendFlag == null) delete process.env.VITE_USER_FACING_PROGRESSION_ENABLED;
  else process.env.VITE_USER_FACING_PROGRESSION_ENABLED = originalFrontendFlag;
  await mongoose.disconnect(); await mongo.stop();
});

test('versioned level and tier mapping preserves the Release 3A level curve', () => {
  assert.deepEqual(resolveLevel(0), { level: 1, tier: 'Initiation', contribution: 0, progress: 0, currentLevelMinimum: 0, nextLevelMinimum: 8, contributionToNextLevel: 8 });
  assert.equal(resolveLevel(800).level, 11);
  assert.equal(resolveLevel(800).tier, 'Established');
  assert.equal(resolveLevel(78408).level, 100);
  assert.equal(resolveLevel(78408).tier, 'Apex');
  assert.equal(resolveLevel(20).progress, 0.5);
  assert.deepEqual(resolveLevel(7.9999), { level: 1, tier: 'Initiation', contribution: 7.99, progress: 0.9988, currentLevelMinimum: 0, nextLevelMinimum: 8, contributionToNextLevel: 0.01 });
  assert.equal(resolveLevel(8).level, 2);
  assert.equal(resolveLevel(8).contribution, 8);
  assert.equal(resolveLevel(8).progress, 0);
  assert.equal(resolveLevel(8.0001).level, 2);
  for (const threshold of [800, 5000, 20000, 45000, 78408]) {
    assert.equal(resolveLevel(threshold - 0.0001).level + 1, resolveLevel(threshold).level);
    assert.equal(resolveLevel(threshold + 0.0001).level, resolveLevel(threshold).level);
  }
  assert.deepEqual(resolveLevel(78408), { level: 100, tier: 'Apex', contribution: 78408, progress: 1, currentLevelMinimum: 78408, nextLevelMinimum: null, contributionToNextLevel: 0 });
});

test('dimension and unlock resolution is deterministic and creator-aware', () => {
  assert.equal(publicDimensions({ creator: 0 }, false).some(item => item.key === 'creator'), false);
  assert.equal(publicDimensions({ creator: 2 }, false).find(item => item.key === 'creator').contribution, 2);
  assert.deepEqual(resolveUnlocks(10).unlocked.map(item => item.id), ['signal_mark']);
  assert.equal(resolveUnlocks(10).next[0].id, 'profile_accent');
});

test('read model separates personal, faction, Unaffiliated, and creator state', async () => {
  const affiliated = await getUserProgression(String(member._id));
  assert.equal(affiliated.level, 12);
  assert.equal(affiliated.creatorMode, true);
  assert.deepEqual(affiliated.faction, { state: 'affiliated', name: 'Neon Test', color: '#39FF14', contribution: 18.5 });
  const solo = await getUserProgression(String(unaffiliated._id));
  assert.equal(solo.faction.state, 'unaffiliated');
  assert.equal(solo.level, 3);
  assert.equal(await FactionMembership.exists({ user: unaffiliated._id }), null);
  const pending = await getUserProgression(String(pendingProjection._id));
  assert.equal(pending.projectionState, 'unavailable');
  assert.equal(pending.updatedAt, null);
  assert.deepEqual(pending.unlocks, { unlocked: [], next: [] });
  assert.equal('level' in pending, false);
  assert.equal('dimensions' in pending, false);
});

test('route is authenticated and requires coordinated frontend and backend activation', async () => {
  delete process.env.USER_FACING_PROGRESSION_ENABLED;
  delete process.env.VITE_USER_FACING_PROGRESSION_ENABLED;
  assert.equal((await request(app).get(`/api/progression/users/${member._id}`).set('Authorization', `Bearer ${token}`)).status, 404);
  process.env.VITE_USER_FACING_PROGRESSION_ENABLED = 'true';
  assert.equal((await request(app).get(`/api/progression/users/${member._id}`).set('Authorization', `Bearer ${token}`)).status, 404);
  delete process.env.VITE_USER_FACING_PROGRESSION_ENABLED;
  process.env.USER_FACING_PROGRESSION_ENABLED = 'true';
  assert.equal((await request(app).get(`/api/progression/users/${member._id}`).set('Authorization', `Bearer ${token}`)).status, 404);
  process.env.VITE_USER_FACING_PROGRESSION_ENABLED = 'true';
  assert.equal((await request(app).get(`/api/progression/users/${member._id}`)).status, 401);
  assert.equal((await request(app).get(`/api/progression/users/${member._id}`).set('Authorization', `Bearer ${token}`)).status, 200);
});

test('route reuses profile visibility policy for owner, privacy audiences, and blocks', async () => {
  process.env.USER_FACING_PROGRESSION_ENABLED = 'true';
  process.env.VITE_USER_FACING_PROGRESSION_ENABLED = 'true';
  const get = () => request(app).get(`/api/progression/users/${member._id}`).set('Authorization', `Bearer ${token}`);
  const ownerToken = jwt.sign({ userId: member._id }, process.env.JWT_SECRET, { algorithm: 'HS256' });

  await User.updateOne({ _id: member._id }, { profilePrivacy: 'public' });
  assert.equal((await get()).status, 200);
  await User.updateOne({ _id: member._id }, { profilePrivacy: 'users' });
  assert.equal((await get()).status, 200);
  await User.updateOne({ _id: member._id }, { profilePrivacy: 'private' });
  assert.equal((await get()).status, 403);
  assert.equal((await request(app).get(`/api/progression/users/${member._id}`).set('Authorization', `Bearer ${ownerToken}`)).status, 200);

  await User.updateOne({ _id: member._id }, { profilePrivacy: 'followers' });
  assert.equal((await get()).status, 403);
  await Follow.create({ follower: viewer._id, followed: member._id });
  assert.equal((await get()).status, 200);

  await User.updateOne({ _id: member._id }, { profilePrivacy: 'friends' });
  assert.equal((await get()).status, 403);
  const [userLow, userHigh] = String(viewer._id) < String(member._id) ? [viewer._id, member._id] : [member._id, viewer._id];
  await Friendship.create({ userLow, userHigh });
  assert.equal((await get()).status, 200);

  await User.updateOne({ _id: member._id }, { profilePrivacy: 'public' });
  await Block.create({ blocker: member._id, blocked: viewer._id });
  assert.equal((await get()).status, 404);
  await Block.deleteMany({});
  await Block.create({ blocker: viewer._id, blocked: member._id });
  assert.equal((await get()).status, 404);
  await Block.deleteMany({});
});

test('public product payload excludes hidden state and platform authority', async () => {
  process.env.USER_FACING_PROGRESSION_ENABLED = 'true';
  process.env.VITE_USER_FACING_PROGRESSION_ENABLED = 'true';
  const response = await request(app).get(`/api/progression/users/${member._id}`).set('Authorization', `Bearer ${token}`);
  const serialized = JSON.stringify(response.body);
  for (const privateField of ['policyArtifact', 'producer', 'evidence', 'qualification', 'allegiance', 'isAdmin', 'platformRole', 'checkpoint', 'projectionContext']) {
    assert.equal(serialized.includes(privateField), false, privateField);
  }
  assert.deepEqual(Object.keys(response.body.data).sort(), ['contribution','contributionToNextLevel','creatorMode','currentLevelMinimum','dimensions','faction','level','nextLevelMinimum','presentationVersion','progress','projectionState','tier','unlocks','updatedAt'].sort());
});

test('Profile V2 and owner profile render one responsive, flag-gated progression surface', () => {
  const panel = fs.readFileSync(path.join(__dirname, '..', '..', 'components', 'ProgressionPanel.tsx'), 'utf8');
  const publicProfile = fs.readFileSync(path.join(__dirname, '..', '..', 'components', 'UserProfilePage.tsx'), 'utf8');
  const ownerProfile = fs.readFileSync(path.join(__dirname, '..', '..', 'components', 'ProfileGrid.tsx'), 'utf8');
  assert.match(panel, /USER_FACING_PROGRESSION_ENABLED/);
  assert.match(panel, /sm:flex-row/);
  assert.match(panel, /md:grid-cols/);
  assert.match(panel, /projectionState === 'unavailable'/);
  assert.match(panel, /Update pending/);
  assert.match(panel, /temporarily unavailable/);
  assert.match(publicProfile, /<ProgressionPanel userId=\{user\._id\}/);
  assert.match(ownerProfile, /<ProgressionPanel userId=\{user\.id\}/);
});

function projection(scope, subjectId, checkpoint) {
  return Projection.create({ scope, subjectId: String(subjectId), projectionContextId: `ctx-${scope}-${subjectId}`, policyId: 'simulation', policyVersion: 'sim-1', policyArtifactDigest: `sha256:${'a'.repeat(64)}`, evaluationGeneration: '1', projectionContext: {}, checkpoint, rebuiltAt: new Date('2026-09-04T12:00:00.000Z') });
}
