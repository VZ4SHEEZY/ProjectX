const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const rateLimit = require('express-rate-limit');
const request = require('supertest');
const health = require('../routes/health');

const buildApp = () => {
  const app = express();
  app.get('/api/health', health);
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 2,
    standardHeaders: true,
    legacyHeaders: false
  }));
  app.get('/api/limited', (req, res) => res.json({ status: 'OK' }));
  return app;
};

test('health is mounted before the global application limiter', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  const healthMount = source.indexOf("app.get('/api/health'");
  const limiterMount = source.indexOf('app.use(limiter)');

  assert.notEqual(healthMount, -1);
  assert.notEqual(limiterMount, -1);
  assert.ok(healthMount < limiterMount);
});

test('repeated health requests bypass the global limiter without changing the response', async () => {
  const app = buildApp();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await request(app).get('/api/health');
    assert.equal(response.status, 200);
    assert.equal(response.body.status, 'OK');
    assert.match(response.body.timestamp, /^\d{4}-\d{2}-\d{2}T/);
  }
});

test('ordinary API routes remain protected by the global limiter', async () => {
  const app = buildApp();

  assert.equal((await request(app).get('/api/limited')).status, 200);
  assert.equal((await request(app).get('/api/limited')).status, 200);
  assert.equal((await request(app).get('/api/limited')).status, 429);
});
