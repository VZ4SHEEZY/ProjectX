const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const request = require('supertest');

process.env.JWT_SECRET = 'route-test-secret';

const User = require('../models/User');
const Post = require('../models/Post');
const AuditLog = require('../models/AuditLog');
const creatorRouter = require('../routes/creator');
const adminRouter = require('../routes/admin');
const observability = require('../services/observability');

const originalMethods = {
  userFindById: User.findById,
  userCountDocuments: User.countDocuments,
  userAggregate: User.aggregate,
  postAggregate: Post.aggregate,
  auditCreate: AuditLog.create
};

const app = express();
app.use(express.json());
app.use('/api/creator', creatorRouter);
app.use('/api/admin', adminRouter);

const userId = '507f1f77bcf86cd799439011';
const token = jwt.sign({ userId }, process.env.JWT_SECRET);
const auth = { Authorization: `Bearer ${token}` };

const restoreMocks = () => {
  User.findById = originalMethods.userFindById;
  User.countDocuments = originalMethods.userCountDocuments;
  User.aggregate = originalMethods.userAggregate;
  Post.aggregate = originalMethods.postAggregate;
  AuditLog.create = originalMethods.auditCreate;
};

test.afterEach(restoreMocks);

test.beforeEach(() => observability.resetForTests());

const mockUserLookups = (authenticatedUser, routeUser) => {
  let calls = 0;
  User.findById = () => {
    calls += 1;
    if (calls === 1) return Promise.resolve(authenticatedUser);
    return {
      select: () => Promise.resolve(routeUser),
      then: (resolve, reject) => Promise.resolve(routeUser).then(resolve, reject)
    };
  };
};

test('subscription tiers reject unauthenticated requests', async () => {
  const response = await request(app).get('/api/creator/subscription-tiers');

  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
});

test('subscription tiers reject authenticated non-creators', async () => {
  const user = { _id: userId, isCreator: false, subscriptionTiers: [] };
  mockUserLookups(user, user);

  const response = await request(app)
    .get('/api/creator/subscription-tiers')
    .set(auth);

  assert.equal(response.status, 403);
  assert.equal(response.body.message, 'Creator access required');
});

test('subscription tiers reject invalid input', async () => {
  const user = { _id: userId, isCreator: true };
  User.findById = () => Promise.resolve(user);

  const response = await request(app)
    .put('/api/creator/subscription-tiers')
    .set(auth)
    .send({ tiers: [{ name: 'Premium', price: -1, description: '', benefits: [] }] });

  assert.equal(response.status, 400);
  assert.match(response.body.message, /price must be between 0 and 1000/);
});

test('subscription tiers persist normalized creator input', async () => {
  const user = {
    _id: userId,
    isCreator: true,
    subscriptionTiers: [],
    async save() {
      this.subscriptionTiers = this.subscriptionTiers.map((tier, index) => ({
        _id: { toString: () => `tier-${index + 1}` },
        ...tier
      }));
    }
  };
  mockUserLookups(user, user);

  const response = await request(app)
    .put('/api/creator/subscription-tiers')
    .set(auth)
    .send({
      tiers: [{
        name: '  Neon Elite  ',
        price: 25,
        description: '  Private drops  ',
        benefits: ['  Early access  '],
        color: 'not-allowed',
        icon: 'not-allowed'
      }]
    });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.data, [{
    id: 'tier-1',
    name: 'Neon Elite',
    price: 25,
    description: 'Private drops',
    benefits: ['Early access'],
    color: 'gray',
    icon: 'star',
    isActive: true
  }]);
});

test('admin statistics reject unauthenticated requests', async () => {
  const response = await request(app).get('/api/admin/stats');

  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
});

test('admin statistics reject authenticated non-admins', async () => {
  User.findById = () => Promise.resolve({ _id: userId, isAdmin: false });

  const response = await request(app).get('/api/admin/stats').set(auth);

  assert.equal(response.status, 403);
  assert.equal(response.body.message, 'Admin access required');
});

test('admin diagnostics reject unauthenticated and non-admin requests', async () => {
  let response = await request(app).get('/api/admin/diagnostics');
  assert.equal(response.status, 401);

  User.findById = () => Promise.resolve({ _id: userId, isAdmin: false });
  response = await request(app).get('/api/admin/diagnostics').set(auth);
  assert.equal(response.status, 403);
});

test('admin diagnostics return aggregate health without secrets or PII', async () => {
  User.findById = () => Promise.resolve({ _id: userId, isAdmin: true });
  observability.increment('authFailures');
  observability.recordError('test_failure', new Error('internal detail'), { requestId: 'safe-request-id' });

  const response = await request(app).get('/api/admin/diagnostics').set(auth);

  assert.equal(response.status, 200);
  assert.equal(response.body.data.metrics.authFailures, 1);
  assert.equal(response.body.data.metrics.errors, 1);
  assert.equal(response.body.data.recentErrors[0].event, 'test_failure');
  assert.equal(response.body.data.recentErrors[0].error.message, undefined);
  assert.equal(JSON.stringify(response.body).includes(process.env.JWT_SECRET), false);
});

test('admin statistics return platform totals and ranked factions', async () => {
  User.findById = () => Promise.resolve({ _id: userId, isAdmin: true });
  User.countDocuments = async () => 12;
  User.aggregate = async () => [
    { _id: 'Neon', users: 5 },
    { _id: 'Chrome', users: 7 }
  ];
  Post.aggregate = async () => {
    Post.aggregate.calls = (Post.aggregate.calls || 0) + 1;
    if (Post.aggregate.calls === 1) return [{ _id: null, posts: 8, likes: 31 }];
    return [
      { _id: 'Neon', posts: 4, likes: 20 },
      { _id: 'Chrome', posts: 4, likes: 11 }
    ];
  };
  AuditLog.create = async () => ({});

  const response = await request(app).get('/api/admin/stats').set(auth);

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.data.totals, {
    users: 12,
    posts: 8,
    likes: 31,
    activeFactions: 2
  });
  assert.deepEqual(response.body.data.factions.map(({ name, engagementSignals, trustedForProgression }) => ({ name, engagementSignals, trustedForProgression })), [
    { name: 'Chrome', engagementSignals: 15, trustedForProgression: false },
    { name: 'Neon', engagementSignals: 24, trustedForProgression: false }
  ]);
  assert.match(response.body.data.generatedAt, /^\d{4}-\d{2}-\d{2}T/);
});
