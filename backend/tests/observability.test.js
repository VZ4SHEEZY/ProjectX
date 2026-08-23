const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const observability = require('../services/observability');

test.beforeEach(() => observability.resetForTests());

test('request middleware assigns and preserves safe request IDs', async () => {
  const app = express();
  app.use(observability.requestContext);
  app.get('/ok', (req, res) => res.json({ requestId: req.id }));

  const generated = await request(app).get('/ok').set('x-request-id', 'bad id with spaces');
  assert.match(generated.headers['x-request-id'], /^[0-9a-f-]{36}$/);
  const supplied = await request(app).get('/ok').set('x-request-id', 'client-request-123');
  assert.equal(supplied.body.requestId, 'client-request-123');
  assert.equal(observability.diagnostics().metrics.requests, 2);
});

test('central error handler records a safe error and returns the existing contract', async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  const app = express();
  app.use(observability.requestContext);
  app.get('/explode', () => { throw new Error('database password secret-value'); });
  app.use(observability.errorHandler);

  try {
    const response = await request(app).get('/explode');
    assert.equal(response.status, 500);
    assert.equal(response.body.error, 'Something went wrong!');
    assert.equal(response.body.message, undefined);
    const summary = observability.diagnostics();
    assert.equal(summary.metrics.errors, 1);
    assert.equal(summary.recentErrors[0].error.message, undefined);
    assert.equal(JSON.stringify(summary).includes('secret-value'), false);
  } finally {
    process.env.NODE_ENV = previousNodeEnv;
  }
});
