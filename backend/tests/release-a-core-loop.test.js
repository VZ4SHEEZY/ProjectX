const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.JWT_SECRET = 'release-a-core-loop-test-secret';

const User = require('../models/User');
const Profile = require('../models/Profile');
const ProfileLayout = require('../models/ProfileLayout');
const ProfileModule = require('../models/ProfileModule');
const AccessRule = require('../models/AccessRule');
const FactionMembership = require('../models/FactionMembership');
const Post = require('../models/Post');
const cdp = require('../services/cdp');
const authRouter = require('../routes/auth');
const profilesRouter = require('../routes/profiles');
const postsRouter = require('../routes/posts');
const searchRouter = require('../routes/search');

let mongo;
const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/profiles', profilesRouter);
app.use('/api/posts', postsRouter);
app.use('/api/search', searchRouter);

test.before(async () => {
  mongo = await MongoMemoryServer.create({ binary: { version: '7.0.14' } });
  await mongoose.connect(mongo.getUri());
  cdp.createEmbeddedWallet = async () => { throw new Error('disabled in test'); };
});

test.after(async () => { await mongoose.disconnect(); await mongo.stop(); });
test.beforeEach(async () => { await mongoose.connection.dropDatabase(); });

const register = data => request(app).post('/api/auth/register').send({
  username: data.username, email: `${data.username}@example.test`, password: 'password', ...data
});

test('registration requires an explicit faction decision and never defaults to Quantum Veil', async () => {
  const missing = await register({ username: 'missingchoice' });
  assert.equal(missing.status, 400);

  const response = await register({ username: 'independent', faction: 'Unaffiliated' });
  assert.equal(response.status, 201);
  assert.equal(response.body.user.faction, 'Unaffiliated');
  const user = await User.findOne({ username: 'independent' });
  assert.equal(await FactionMembership.exists({ user: user._id }), null);
  const profile = await Profile.findOne({ user: user._id });
  assert.equal((await ProfileLayout.findOne({ profile: profile._id })).factionStarterTheme, 'off');
});

test('an explicit faction creates canonical membership while DOB does not override it', async () => {
  const response = await register({ username: 'explicitfaction', faction: 'Neon Wraith', dateOfBirth: '2000-01-25' });
  assert.equal(response.status, 201);
  assert.equal(response.body.user.faction, 'Neon Wraith');
  const user = await User.findOne({ username: 'explicitfaction' });
  assert.ok(await FactionMembership.exists({ user: user._id, status: 'active' }));
});

test('anonymous normalized profiles expose public modules and hide private modules', async () => {
  const owner = await User.create({ username: 'publicowner', email: 'owner@example.test', password: 'password', faction: 'Unaffiliated' });
  const profile = await Profile.create({ user: owner._id, displayName: 'Public Owner', bio: 'safe public bio' });
  await ProfileLayout.create({ profile: profile._id, factionStarterTheme: 'off' });
  const privateRule = await AccessRule.create({ owner: owner._id, name: 'Signed in only', expression: { op: 'predicate', type: 'authenticated' }, presentation: 'hidden' });
  await ProfileModule.create([
    { profile: profile._id, type: 'identity', position: 0, enabled: true },
    { profile: profile._id, type: 'bio', position: 1, enabled: true, accessRule: privateRule._id }
  ]);
  const response = await request(app).get(`/api/profiles/${owner.username}`);
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.data.modules.map(module => module.type), ['identity']);
  assert.equal(response.body.data.profile.bio, 'safe public bio');
  assert.equal(response.body.data.owner.email, undefined);
});

test('primary feeds page without duplicate records and return bounded metadata', async () => {
  const viewer = await User.create({ username: 'feedviewer', email: 'viewer@example.test', password: 'password', faction: 'Unaffiliated', isAgeVerified: true });
  const author = await User.create({ username: 'feedauthor', email: 'author@example.test', password: 'password', faction: 'Unaffiliated' });
  for (let index = 0; index < 5; index++) await Post.create({ author: author._id, type: 'text', status: 'published', visibility: 'public', description: `post ${index}`, createdAt: new Date(Date.now() + index) });
  const token = jwt.sign({ userId: viewer._id }, process.env.JWT_SECRET);
  const headers = { Authorization: `Bearer ${token}` };
  const first = await request(app).get('/api/posts/feed/foryou?page=1&limit=2').set(headers);
  const second = await request(app).get('/api/posts/feed/foryou?page=2&limit=2').set(headers);
  assert.equal(first.status, 200); assert.equal(second.status, 200);
  assert.equal(first.body.data.length, 2); assert.equal(first.body.hasMore, true);
  assert.equal(second.body.currentPage, 2);
  assert.equal(new Set([...first.body.data, ...second.body.data].map(post => post._id)).size, 4);
});

test('autocomplete returns bounded distinct hashtags without the distinct-limit failure', async () => {
  const author = await User.create({ username: 'searchauthor', email: 'search@example.test', password: 'password', faction: 'Unaffiliated' });
  await Post.create({ author: author._id, type: 'text', status: 'published', visibility: 'public', description: 'search', tags: ['cyber', 'cyberpunk', 'cyber'] });
  const response = await request(app).get('/api/search/suggestions?q=cy&limit=1');
  assert.equal(response.status, 200);
  assert.equal(response.body.data.hashtags.length, 1);
  assert.match(response.body.data.hashtags[0].tag, /^cy/i);
});
