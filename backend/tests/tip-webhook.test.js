const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');

process.env.TIP_WEBHOOK_SECRET = 'webhook-test-secret';
const Tip = require('../models/Tip');
const tipsRouter = require('../routes/tips');
const originalUpdate = Tip.findByIdAndUpdate;
const app = express();
app.use(express.json());
app.use('/api/tips', tipsRouter);

test.afterEach(() => { Tip.findByIdAndUpdate = originalUpdate; });

test('tip confirmation webhook rejects missing and invalid secrets', async () => {
  for (const secret of [undefined, 'wrong-secret']) {
    let operation = request(app).post('/api/tips/webhook/confirm').send({ tipId: 'tip', txHash: 'hash' });
    if (secret) operation = operation.set('x-webhook-secret', secret);
    const response = await operation;
    assert.equal(response.status, 401);
  }
});

test('tip confirmation webhook accepts its configured secret', async () => {
  Tip.findByIdAndUpdate = async () => ({ _id: 'tip', txStatus: 'confirmed', txHash: 'hash' });
  const response = await request(app)
    .post('/api/tips/webhook/confirm')
    .set('x-webhook-secret', process.env.TIP_WEBHOOK_SECRET)
    .send({ tipId: '507f191e810c19729de860ea', txHash: 'hash', status: 'success' });
  assert.equal(response.status, 200);
  assert.equal(response.body.tip.status, 'confirmed');
});
