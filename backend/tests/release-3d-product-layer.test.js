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
const Projection = require('../models/ProgressionProjection');
const progressionRoutes = require('../routes/progression');
const { resolveLevel, resolveUnlocks, publicDimensions, getUserProgression } = require('../progression/product/read-service');

let mongo;
let viewer;
let member;
let unaffiliated;
let token;
const originalFlag = process.env.USER_FACING_PROGRESSION_ENABLED;

const app = express();
app.use(express.json());
app.use('/api/progression', progressionRoutes);
app.use((error, req, res, next) => res.status(500).json({ message: error.message }));

test.before(async () => {
  mongo = await MongoMemoryServer.create({ binary: { version: '7.0.14' } });
  await mongoose.connect(mongo.getUri());
  process.env.JWT_SECRET = 'release-3d-test-secret-release-3d';
  [viewer, member, unaffiliated] = await User.create([
    { username: 'viewer_3d', email: 'viewer3d@example.com', password: 'test-hash', isAgeVerified: true },
    { username: 'member_3d', email: 'member3d@example.com', password: 'test-hash', isCreator: true },
    { username: 'vz4sheezy', email: 'vz3d@example.com', password: 'test-hash', faction: 'Unaffiliated' }
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
  await mongoose.disconnect(); await mongo.stop();
});

test('versioned level and tier mapping preserves the Release 3A level curve', () => {
  assert.deepEqual(resolveLevel(0), { level: 1, tier: 'Initiation', contribution: 0, progress: 0, currentLevelMinimum: 0, nextLevelMinimum: 8, contributionToNextLevel: 8 });
  assert.equal(resolveLevel(800).level, 11);
  assert.equal(resolveLevel(800).tier, 'Established');
  assert.equal(resolveLevel(78408).level, 100);
  assert.equal(resolveLevel(78408).tier, 'Apex');
  assert.equal(resolveLevel(20).progress, 0.5);
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
});

test('route is authenticated and remains disabled unless explicitly enabled', async () => {
  delete process.env.USER_FACING_PROGRESSION_ENABLED;
  assert.equal((await request(app).get(`/api/progression/users/${member._id}`).set('Authorization', `Bearer ${token}`)).status, 404);
  process.env.USER_FACING_PROGRESSION_ENABLED = 'true';
  assert.equal((await request(app).get(`/api/progression/users/${member._id}`)).status, 401);
  assert.equal((await request(app).get(`/api/progression/users/${member._id}`).set('Authorization', `Bearer ${token}`)).status, 200);
});

test('public product payload excludes hidden state and platform authority', async () => {
  process.env.USER_FACING_PROGRESSION_ENABLED = 'true';
  const response = await request(app).get(`/api/progression/users/${member._id}`).set('Authorization', `Bearer ${token}`);
  const serialized = JSON.stringify(response.body);
  for (const privateField of ['policyArtifact', 'producer', 'evidence', 'qualification', 'allegiance', 'isAdmin', 'platformRole', 'checkpoint', 'projectionContext']) {
    assert.equal(serialized.includes(privateField), false, privateField);
  }
  assert.deepEqual(Object.keys(response.body.data).sort(), ['contribution','contributionToNextLevel','creatorMode','currentLevelMinimum','dimensions','faction','level','nextLevelMinimum','presentationVersion','progress','tier','unlocks','updatedAt'].sort());
});

test('Profile V2 and owner profile render one responsive, flag-gated progression surface', () => {
  const panel = fs.readFileSync(path.join(__dirname, '..', '..', 'components', 'ProgressionPanel.tsx'), 'utf8');
  const publicProfile = fs.readFileSync(path.join(__dirname, '..', '..', 'components', 'UserProfilePage.tsx'), 'utf8');
  const ownerProfile = fs.readFileSync(path.join(__dirname, '..', '..', 'components', 'ProfileGrid.tsx'), 'utf8');
  assert.match(panel, /USER_FACING_PROGRESSION_ENABLED/);
  assert.match(panel, /sm:flex-row/);
  assert.match(panel, /md:grid-cols/);
  assert.match(publicProfile, /<ProgressionPanel userId=\{user\._id\}/);
  assert.match(ownerProfile, /<ProgressionPanel userId=\{user\.id\}/);
});

function projection(scope, subjectId, checkpoint) {
  return Projection.create({ scope, subjectId: String(subjectId), projectionContextId: `ctx-${scope}-${subjectId}`, policyId: 'simulation', policyVersion: 'sim-1', policyArtifactDigest: `sha256:${'a'.repeat(64)}`, evaluationGeneration: '1', projectionContext: {}, checkpoint, rebuiltAt: new Date('2026-09-04T12:00:00.000Z') });
}
