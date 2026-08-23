const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');

process.env.TIP_WEBHOOK_SECRET = 'webhook-test-secret';
const Tip = require('../models/Tip');
const tipsRouter = require('../routes/tips');
const originalFind = Tip.findById;
const app = express();
app.use(express.json());
app.use('/api/tips', tipsRouter);

test.afterEach(() => { Tip.findById = originalFind; });

test('tip confirmation webhook rejects missing and invalid secrets', async () => {
  for (const secret of [undefined, 'wrong-secret']) {
    let operation = request(app).post('/api/tips/webhook/confirm').send({ tipId: 'tip', txHash: 'hash' });
    if (secret) operation = operation.set('x-webhook-secret', secret);
    const response = await operation;
    assert.equal(response.status, 401);
  }
});

test('tip confirmation webhook never trusts caller-supplied success status', async () => {
  Tip.findById = async () => ({ _id: 'tip', txStatus: 'pending', toObject: () => ({}), save: async () => {} });
  const response = await request(app)
    .post('/api/tips/webhook/confirm')
    .set('x-webhook-secret', process.env.TIP_WEBHOOK_SECRET)
    .send({ tipId: '507f191e810c19729de860ea', txHash: 'hash', status: 'success' });
  assert.equal(response.status, 400);
  assert.match(response.body.error, /Malformed transaction hash/);
});
