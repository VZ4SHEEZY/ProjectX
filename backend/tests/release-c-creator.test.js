const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
process.env.JWT_SECRET = 'release-c-isolated-test';
const User = require('../models/User');
const Post = require('../models/Post');
const Profile = require('../models/Profile');
const AccountCapability = require('../models/AccountCapability');
const AuditLog = require('../models/AuditLog');
const Tip = require('../models/Tip');
const tipService = require('../services/tip');
const PlatformRole = require('../models/PlatformRole');
const { canViewPost } = require('../services/accessPolicy');
const app = express(); app.use(express.json());
for (const route of ['creator','posts','moderation','tips','age-verification']) app.use(`/api/${route}`, require(`../routes/${route}`));
let mongo;
const auth = u => ({ Authorization: `Bearer ${jwt.sign({ userId: u._id }, process.env.JWT_SECRET)}` });
const makeUser = (name, extra={}) => User.create({ username: name, email: `${name}@example.test`, password: 'password', faction: 'Unaffiliated', ...extra });
test.before(async () => { mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 }, binary: { version: '7.0.14' } }); await mongoose.connect(mongo.getUri()); });
test.after(async () => { await mongoose.disconnect(); await mongo.stop(); });
test.beforeEach(async () => { await mongoose.connection.dropDatabase(); });
test('activation preserves the same profile, identity, faction, relationships and content without verification grants', async () => {
  const friend = await makeUser('friend'); const user = await makeUser('creator', { following: [friend._id], followers: [friend._id], bio: 'original' });
  const profile = await Profile.create({ user: user._id, displayName: 'Original' });
  const post = await Post.create({ author: user._id, type: 'text', content: 'original post' });
  const before = user.toObject();
  const res = await request(app).post('/api/creator/apply').set(auth(user)); assert.equal(res.status, 200, JSON.stringify(res.body));
  const after = await User.findById(user._id);
  for (const key of ['username','faction','bio']) assert.equal(after[key], before[key]);
  assert.deepEqual(after.followers.map(String), before.followers.map(String)); assert.deepEqual(after.following.map(String), before.following.map(String));
  assert.equal(String((await Profile.findOne({ user: user._id }))._id), String(profile._id));
  assert.ok(await Post.exists({ _id: post._id, author: user._id })); assert.equal(after.isCreator, true); assert.equal(after.isAgeVerified, false); assert.equal(after.isCreatorVerified, false);
  assert.equal((await AccountCapability.findOne({ user: user._id })).state, 'enabled');
  const retry = await request(app).post('/api/creator/apply').set(auth(user)); assert.equal(retry.status, 200);
  const studio = await request(app).get('/api/creator/studio').set(auth(user)); assert.equal(studio.body.posts.length, 1); assert.equal(studio.body.monetization.realPaymentsEnabled, false);
});
test('legacy age flags and owner access cannot bypass unavailable verification; updates fail closed', async () => {
  const owner = await makeUser('owner', { isAgeVerified: true, isCreatorVerified: true, isCreator: true });
  const post = await Post.create({ author: owner._id, type: 'text', isNSFW: true, content: 'restricted-body-must-not-leak' });
  assert.equal((await canViewPost(owner, post, owner)).allowed, false);
  const studio = await request(app).get('/api/creator/studio').set(auth(owner)); assert.equal(studio.status, 200); assert.equal(JSON.stringify(studio.body).includes('restricted-body-must-not-leak'), false);
  assert.equal(require('../services/accessPolicy').evaluateAccessExpression({ isOwner: true, ageVerified: false }, { op: 'predicate', type: 'age_verified' }).allowed, false);
  const update = await request(app).put(`/api/posts/${post._id}`).set(auth(owner)).send({ isNSFW: true }); assert.equal(update.status, 403);
  const publicPost = await Post.create({ author: owner._id, type: 'text' });
  const edit = await request(app).put(`/api/posts/${publicPost._id}`).set(auth(owner)).send({ title: 'Edited title', content: 'edited', status: 'archived' }); assert.equal(edit.status, 200); assert.equal(edit.body.data.title, 'Edited title');
  const status = await request(app).get('/api/age-verification/status').set(auth(owner)); assert.equal(status.body.verification.age.verified, false);
});
test('reports are idempotent; ordinary users cannot enforce; removal is audited and cannot be republished', async () => {
  const owner = await makeUser('owner'); const reporter = await makeUser('reporter'); const admin = await makeUser('admin', { isAdmin: true });
  const post = await Post.create({ author: owner._id, type: 'text', content: 'reported post' });
  for (let i=0;i<2;i++) assert.equal((await request(app).post('/api/moderation/reports').set(auth(reporter)).send({ postId: post._id, reason: 'spam' })).status, 200);
  assert.equal((await Post.findById(post._id)).reports.length, 1);
  const action = { action: 'remove', targetId: post._id, reason: 'Confirmed spam' };
  assert.equal((await request(app).post('/api/moderation/enforce').set(auth(reporter)).send(action)).status, 403);
  assert.equal((await request(app).post('/api/moderation/enforce').set(auth(admin)).send(action)).status, 200);
  assert.equal((await Post.findById(post._id)).moderationState, 'removed'); assert.equal(await AuditLog.countDocuments({ action: 'moderation_remove' }), 1);
  assert.equal((await request(app).put(`/api/posts/${post._id}`).set(auth(owner)).send({ status: 'published' })).status, 403);
  assert.equal((await canViewPost(owner, await Post.findById(post._id), owner)).allowed, false);
});
test('audit failure rolls enforcement back', async () => {
  const admin = await makeUser('admin', { isAdmin: true }); const post = await Post.create({ author: admin._id, type: 'text', isReported: true });
  const original = AuditLog.create; AuditLog.create = async () => { throw new Error('audit unavailable'); };
  try { const res = await request(app).post('/api/moderation/enforce').set(auth(admin)).send({ action: 'remove', targetId: post._id, reason: 'spam' }); assert.equal(res.status, 503); assert.equal((await Post.findById(post._id)).status, 'published'); }
  finally { AuditLog.create = original; }
});
test('suspended creator capabilities cannot be reactivated; receipt lists are private', async () => {
  const user = await makeUser('suspended'); await AccountCapability.create({ user: user._id, capability: 'creator_mode', state: 'suspended' });
  assert.equal((await request(app).post('/api/creator/apply').set(auth(user))).status, 403);
  const other = await makeUser('other'); assert.equal((await request(app).get(`/api/tips/creator/${other._id}`).set(auth(user))).status, 403);
});
test('payment confirmation passes stored wallet intent fields to verifier and records pending receipt', async () => {
  const user = await makeUser('payer'); const creator = await makeUser('payee', { isCreator: true });
  const address = n => `0x${String(n).padStart(40,'0')}`;
  const tip = await Tip.create({ sender: user._id, creator: creator._id, amount: '1', amountUnits: '1000000', creatorAmount: '0.8', platformAmount: '0.2', idempotencyKey: 'release-c-payment', senderWallet: address(1), creatorWallet: address(2), routerAddress: address(3), treasuryAddress: address(4), tokenAddress: address(5), expiresAt: new Date(Date.now()+60000) });
  const original = tipService.verifyTipTransaction;
  tipService.verifyTipTransaction = async intent => { assert.equal(intent.sender, tip.senderWallet); assert.equal(intent.creator, tip.creatorWallet); assert.equal(intent.router, tip.routerAddress); return { pending: true, confirmations: 1 }; };
  try { const res = await request(app).post(`/api/tips/intents/${tip._id}/confirm`).set(auth(user)).send({ txHash: `0x${'a'.repeat(64)}` }); assert.equal(res.status, 202); assert.equal((await Tip.findById(tip._id)).confirmationCount, 1); }
  finally { tipService.verifyTipTransaction = original; }
});
test('moderators can review and remove reports but cannot suspend accounts or override verification', async () => {
  const moderator = await makeUser('moderator'); const user = await makeUser('ordinary');
  await PlatformRole.create({ user: moderator._id, role: 'moderator', state: 'active' });
  assert.equal((await request(app).get('/api/moderation/queue').set(auth(moderator))).status, 200);
  assert.equal((await request(app).post('/api/moderation/enforce').set(auth(moderator)).send({ action: 'suspend_user', targetId: user._id, reason: 'reviewed' })).status, 403);
  const admin = await makeUser('admin', { isAdmin: true });
  assert.equal((await request(app).post('/api/creator/verify-admin').set(auth(admin)).send({ userId: user._id })).status, 503);
  assert.equal((await User.findById(user._id)).isCreatorVerified, false);
});
test('verified payment finality produces a confirmed receipt once, rejects replay, and totals all receipts', async () => {
  const { ethers } = require('ethers');
  const { TipService } = require('../services/tip');
  const address = n => `0x${String(n).padStart(40, '0')}`;
  const sender = address(1), creatorWallet = address(2), router = address(3), treasury = address(4);
  const payer = await makeUser('payer', { externalWalletAddress: sender });
  const creator = await makeUser('payee', { isCreator: true, externalWalletAddress: creatorWallet });
  const hash = `0x${'b'.repeat(64)}`;
  const service = new TipService({ PAYMENT_EXECUTION_ENABLED: 'true', BASE_SEPOLIA_RPC_URL: 'https://isolated.example.test', TIP_ROUTER_CONTRACT_ADDRESS: router, TIP_ROUTER_TREASURY_ADDRESS: treasury, TIP_ROUTER_CODE_HASH: `0x${'c'.repeat(64)}`, USDC_SEPOLIA_ADDRESS: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' });
  const event = service.tipInterface.encodeEventLog(service.tipInterface.getEvent('TipSent'), [sender, creatorWallet, 1000000n, 800000n, 200000n, 1n]);
  service.provider = { getTransactionReceipt: async () => ({ status: 1, from: sender, to: router, blockNumber: 10, hash, logs: [{ address: router, ...event }] }), getBlockNumber: async () => 12, getTransaction: async () => ({ chainId: 84532n, data: service.tipInterface.encodeFunctionData('sendTip', [creatorWallet, 1000000n]), value: 0n }) };
  // The test adapter exists only in this disposable database/process. Production has no adapter bypass.
  service.assertExecutionEnabled = async () => {};
  const originals = Object.fromEntries(['assertExecutionEnabled','getAllowance','createIntent','verifyTipTransaction'].map(k => [k, tipService[k]]));
  tipService.assertExecutionEnabled = async () => {}; tipService.getAllowance = async () => 1000000n;
  tipService.createIntent = service.createIntent.bind(service); tipService.verifyTipTransaction = service.verifyTipTransaction.bind(service);
  try {
    const intent = await request(app).post('/api/tips/intents').set(auth(payer)).set('Idempotency-Key', 'release_c_final_payment').send({ creatorId: creator._id, amount: '1' });
    assert.equal(intent.status, 201, JSON.stringify(intent.body)); assert.equal(intent.body.approvalRequired, false);
    const id = intent.body.intent._id;
    const confirm = await request(app).post(`/api/tips/intents/${id}/confirm`).set(auth(payer)).send({ txHash: hash });
    assert.equal(confirm.status, 200, JSON.stringify(confirm.body)); assert.equal(confirm.body.tip.status, 'confirmed');
    const duplicate = await request(app).post(`/api/tips/intents/${id}/confirm`).set(auth(payer)).send({ txHash: hash }); assert.equal(duplicate.body.duplicate, true);
    assert.equal((await request(app).post(`/api/tips/intents/${id}/confirm`).set(auth(payer)).send({ txHash: `0x${'d'.repeat(64)}` })).status, 409);
    assert.equal((await request(app).get(`/api/tips/intents/${id}`).set(auth(creator))).status, 404);
    const template = (await Tip.findById(id)).toObject(); delete template._id; delete template.txHash;
    await Tip.insertMany(Array.from({ length: 100 }, (_, i) => ({ ...template, idempotencyKey: `fixture-${i}` })));
    const earnings = await request(app).get('/api/creator/earnings').set(auth(creator)); assert.equal(earnings.status, 200, JSON.stringify(earnings.body));
    assert.equal(earnings.body.stats.totalTips, 101); assert.equal(ethers.parseUnits(earnings.body.stats.totalEarnings, 6), 80800000n); assert.equal(earnings.body.recentTips.length, 100);
  } finally { Object.assign(tipService, originals); }
});
test('reports never leak through public feeds, direct post responses or creator discovery', async () => {
  const owner = await makeUser('owner', { isCreator: true }); const reporter = await makeUser('reporter');
  const post = await Post.create({ author: owner._id, type: 'text', content: 'public content', reports: [{ user: reporter._id, reason: 'privacy' }], isReported: true });
  for (const url of ['/api/posts', `/api/posts/${post._id}`]) {
    const res = await request(app).get(url); assert.equal(res.status, 200); assert.equal(JSON.stringify(res.body).includes('reports'), false); assert.equal(JSON.stringify(res.body).includes(String(reporter._id)), false);
  }
  await makeUser('privatecreator', { isCreator: true, profilePrivacy: 'private' });
  const discovery = await request(app).get('/api/creator/discover'); assert.equal(discovery.status, 200); assert.deepEqual(discovery.body.creators.map(u => u.username), ['owner']);
});
test('concurrent creator activation retries preserve flags and enqueue approval once', async () => {
  const user = await makeUser('concurrent');
  const responses = await Promise.all([1, 2].map(() => request(app).post('/api/creator/apply').set(auth(user))));
  for (const res of responses) assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal((await User.findById(user._id)).isCreator, true);
  assert.equal(await AccountCapability.countDocuments({ user: user._id, state: 'enabled' }), 1);
  assert.equal(await require('../models/Creator').countDocuments({ user: user._id, state: 'active' }), 1);
  assert.equal(await require('../models/ProgressionOutbox').countDocuments({ 'event.actorId': String(user._id) }), 1);
});
test('interaction routes enforce author privacy and feeds omit deleted authors', async () => {
  const owner = await makeUser('privateowner', { profilePrivacy: 'private' }); const outsider = await makeUser('outsider');
  const post = await Post.create({ author: owner._id, type: 'text' });
  assert.equal((await request(app).post(`/api/posts/${post._id}/like`).set(auth(outsider))).status, 403);
  await User.deleteOne({ _id: owner._id });
  const feed = await request(app).get('/api/posts'); assert.equal(feed.status, 200); assert.equal(feed.body.data.length, 0);
});
