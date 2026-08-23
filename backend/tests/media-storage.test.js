const test = require('node:test');
const assert = require('node:assert/strict');
const cloudinary = require('cloudinary').v2;
const express = require('express');
const jwt = require('jsonwebtoken');
const request = require('supertest');

process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
process.env.CLOUDINARY_API_KEY = 'test-key';
process.env.CLOUDINARY_API_SECRET = 'test-secret';
process.env.JWT_SECRET = 'media-storage-route-test-secret';

const mediaStorage = require('../services/mediaStorage');
const originalUploadStream = cloudinary.uploader.upload_stream;
const originalDestroy = cloudinary.uploader.destroy;

test.afterEach(() => {
  cloudinary.uploader.upload_stream = originalUploadStream;
  cloudinary.uploader.destroy = originalDestroy;
});

test('voice storage surfaces provider upload failures without returning a URL', async () => {
  cloudinary.uploader.upload_stream = (options, callback) => {
    const stream = new (require('stream').Writable)({ write(chunk, encoding, done) { done(); } });
    stream.on('finish', () => callback(new Error('provider unavailable')));
    return stream;
  };

  await assert.rejects(
    mediaStorage.storeVoiceAudio({
      buffer: Buffer.from('audio'),
      mimeType: 'audio/webm',
      originalName: 'voice.webm',
      ownerId: '507f1f77bcf86cd799439011'
    }),
    /provider unavailable/
  );
});

test('voice storage returns only durable provider identifiers on success', async () => {
  cloudinary.uploader.upload_stream = (options, callback) => {
    const stream = new (require('stream').Writable)({ write(chunk, encoding, done) { done(); } });
    stream.on('finish', () => callback(null, {
      secure_url: 'https://media.example/voice.webm',
      public_id: 'cyberdope/voice/voice',
      bytes: 5,
      duration: 1
    }));
    return stream;
  };

  const result = await mediaStorage.storeVoiceAudio({
    buffer: Buffer.from('audio'),
    mimeType: 'audio/webm',
    originalName: 'voice.webm',
    ownerId: '507f1f77bcf86cd799439011'
  });

  assert.equal(result.url, 'https://media.example/voice.webm');
  assert.equal(result.storageKey, 'cyberdope/voice/voice');
  assert.equal(result.url.startsWith('/uploads/'), false);
});

test('voice deletion rejects provider failures so metadata is not silently orphaned', async () => {
  cloudinary.uploader.destroy = async () => ({ result: 'failed' });
  await assert.rejects(mediaStorage.deleteVoiceAudio('cyberdope/voice/voice'), /deletion failed/);
});

test('voice send returns the existing error contract when durable storage fails', async () => {
  const User = require('../models/User');
  const originalFindById = User.findById;
  const originalStore = mediaStorage.storeVoiceAudio;
  User.findById = async () => ({ _id: '507f1f77bcf86cd799439011' });
  mediaStorage.storeVoiceAudio = async () => { throw new Error('provider unavailable'); };
  delete require.cache[require.resolve('../routes/voice')];
  const voiceRouter = require('../routes/voice');
  const app = express();
  app.use('/api/voice', voiceRouter);

  try {
    const token = jwt.sign({ userId: '507f1f77bcf86cd799439011' }, process.env.JWT_SECRET);
    const response = await request(app)
      .post('/api/voice/send')
      .set('Authorization', `Bearer ${token}`)
      .field('recipientId', '507f191e810c19729de860ea')
      .field('duration', '1')
      .attach('audio', Buffer.from('audio'), { filename: 'voice.webm', contentType: 'audio/webm' });

    assert.equal(response.status, 500);
    assert.deepEqual(response.body, { error: 'Failed to send voice message' });
  } finally {
    User.findById = originalFindById;
    mediaStorage.storeVoiceAudio = originalStore;
    delete require.cache[require.resolve('../routes/voice')];
  }
});
