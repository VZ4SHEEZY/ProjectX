const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const { PassThrough } = require('node:stream');
const cloudinary = require('cloudinary').v2;

process.env.JWT_SECRET = 'release-readiness-test-secret';
const User = require('../models/User');
const VoiceMessage = require('../models/VoiceMessage');
const uploadRouter = require('../routes/upload');
const voiceRouter = require('../routes/voice');
const yotiRouter = require('../routes/verify-yoti');

const userId = '507f1f77bcf86cd799439011';
const auth = { Authorization: `Bearer ${jwt.sign({ userId }, process.env.JWT_SECRET)}` };
const originals = {
  findUser: User.findById,
  findVoice: VoiceMessage.findById,
  upload: cloudinary.uploader.upload_stream,
  destroy: cloudinary.uploader.destroy
};
const app = express();
app.use(express.json());
app.use('/api/upload', uploadRouter);
app.use('/api/voice', voiceRouter);
app.use('/api/verify/yoti', yotiRouter);

test.afterEach(() => {
  User.findById = originals.findUser;
  VoiceMessage.findById = originals.findVoice;
  cloudinary.uploader.upload_stream = originals.upload;
  cloudinary.uploader.destroy = originals.destroy;
});

const queryFor = value => ({ then: (resolve, reject) => Promise.resolve(value).then(resolve, reject), select: () => Promise.resolve(value) });

test('identity verification cannot create or confirm stub sessions', async () => {
  const user = { _id: userId, isActive: true };
  User.findById = () => Promise.resolve(user);
  const init = await request(app).post('/api/verify/yoti/init').set(auth).send({ verificationType: 'both' });
  assert.equal(init.status, 503);
  assert.equal(init.body.code, 'IDENTITY_VERIFICATION_UNAVAILABLE');
  const confirm = await request(app).post('/api/verify/yoti/confirm').set(auth).send({ sessionId: 'fake' });
  assert.equal(confirm.status, 503);
});

test('voice transcription returns unavailable and never writes canned text', async () => {
  User.findById = () => Promise.resolve({ _id: userId, isActive: true });
  let saved = false;
  VoiceMessage.findById = () => Promise.resolve({ sender: userId, recipient: '507f191e810c19729de860ea', save: async () => { saved = true; } });
  const response = await request(app).post('/api/voice/507f191e810c19729de860eb/transcribe').set(auth);
  assert.equal(response.status, 501);
  assert.equal(response.body.code, 'TRANSCRIPTION_UNAVAILABLE');
  assert.equal(saved, false);
});

test('avatar upload validates type, persists managed key, and deletes replaced avatar', async () => {
  const user = { _id: userId, isActive: true, avatar: 'old', avatarPublicId: 'cyberdope/avatars/old', save: async () => {} };
  User.findById = () => queryFor(user);
  cloudinary.uploader.upload_stream = (options, callback) => {
    const stream = new PassThrough();
    stream.on('finish', () => callback(null, { secure_url: 'https://res.cloudinary.com/test/new.webp', public_id: 'cyberdope/avatars/new' }));
    return stream;
  };
  const deleted = [];
  cloudinary.uploader.destroy = async key => { deleted.push(key); return { result: 'ok' }; };
  const response = await request(app).post('/api/upload/avatar').set(auth).attach('avatar', Buffer.from('image'), { filename: 'avatar.png', contentType: 'image/png' });
  assert.equal(response.status, 200);
  assert.equal(user.avatarPublicId, 'cyberdope/avatars/new');
  assert.deepEqual(deleted, ['cyberdope/avatars/old']);

  const invalid = await request(app).post('/api/upload/avatar').set(auth).attach('avatar', Buffer.from('bad'), { filename: 'avatar.gif', contentType: 'image/gif' });
  assert.equal(invalid.status, 400);
});
