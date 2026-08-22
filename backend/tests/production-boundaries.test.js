const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const request = require('supertest');

process.env.JWT_SECRET = 'production-boundary-test-secret';

const User = require('../models/User');
const Story = require('../models/Story');
const Message = require('../models/Message');
const usersRouter = require('../routes/users');
const storiesRouter = require('../routes/stories');
const messagesRouter = require('../routes/messages');
const { validateEnv, allowedOrigins } = require('../config/env');

const userId = '507f1f77bcf86cd799439011';
const token = jwt.sign({ userId }, process.env.JWT_SECRET);
const auth = { Authorization: `Bearer ${token}` };
const original = {
  userFindById: User.findById,
  userFindByIdAndUpdate: User.findByIdAndUpdate,
  storyDeleteMany: Story.deleteMany,
  messageCount: Message.countDocuments
};

test.afterEach(() => {
  User.findById = original.userFindById;
  User.findByIdAndUpdate = original.userFindByIdAndUpdate;
  Story.deleteMany = original.storyDeleteMany;
  Message.countDocuments = original.messageCount;
});

const appFor = (path, router) => {
  const app = express();
  app.use(express.json());
  app.use(path, router);
  return app;
};

test('production env validation fails clearly for missing and weak secrets', () => {
  assert.throws(() => validateEnv({ NODE_ENV: 'production' }), /MONGODB_URI, JWT_SECRET/);
  assert.throws(
    () => validateEnv({ NODE_ENV: 'production', MONGODB_URI: 'mongodb://db', JWT_SECRET: 'short' }),
    /at least 32 characters/
  );
  assert.doesNotThrow(() => validateEnv({
    NODE_ENV: 'production',
    MONGODB_URI: 'mongodb://db',
    JWT_SECRET: 'a'.repeat(32)
  }));
});

test('comma-separated frontend origins are normalized', () => {
  const origins = allowedOrigins({ FRONTEND_URL: 'https://one.example, https://two.example ' });
  assert.ok(origins.includes('https://one.example'));
  assert.ok(origins.includes('https://two.example'));
});

test('profile updates cannot self-promote a user to creator', async () => {
  const user = { _id: userId, isCreator: false };
  let update;
  User.findById = (id, fields, options) => {
    if (!fields) return Promise.resolve(user);
    update = fields;
    return { select: () => Promise.resolve({ ...user, ...fields }) };
  };
  User.findByIdAndUpdate = (id, fields) => {
    update = fields;
    return { select: () => Promise.resolve({ ...user, ...fields }) };
  };

  const response = await request(appFor('/api/users', usersRouter))
    .put('/api/users/profile')
    .set(auth)
    .send({ bio: 'updated', isCreator: true });

  assert.equal(response.status, 200);
  assert.equal(update.bio, 'updated');
  assert.equal(update.isCreator, undefined);
});

test('story cleanup rejects non-admins and works for admins', async () => {
  const app = appFor('/api/stories', storiesRouter);
  User.findById = () => Promise.resolve({ _id: userId, isAdmin: false });
  let response = await request(app).delete('/api/stories/cleanup/expired').set(auth);
  assert.equal(response.status, 403);

  User.findById = () => Promise.resolve({ _id: userId, isAdmin: true });
  Story.deleteMany = async () => ({ deletedCount: 4 });
  response = await request(app).delete('/api/stories/cleanup/expired').set(auth);
  assert.equal(response.status, 200);
  assert.equal(response.body.deleted, 4);
});

test('unread message count uses the static route instead of recipient lookup', async () => {
  User.findById = () => Promise.resolve({ _id: userId });
  Message.countDocuments = async () => 3;
  const response = await request(appFor('/api/messages', messagesRouter))
    .get('/api/messages/unread/count')
    .set(auth);
  assert.equal(response.status, 200);
  assert.equal(response.body.unreadCount, 3);
});

test('message creation rejects malformed content without crashing', async () => {
  User.findById = () => Promise.resolve({ _id: userId });
  const app = appFor('/api/messages', messagesRouter);
  for (const content of [null, { text: 'not a string' }]) {
    const response = await request(app)
      .post('/api/messages')
      .set(auth)
      .send({ recipientId: '507f191e810c19729de860ea', content });
    assert.equal(response.status, 400);
  }
});
