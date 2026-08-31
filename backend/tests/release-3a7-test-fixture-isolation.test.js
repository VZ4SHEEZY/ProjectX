'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const backendRoot = path.resolve(__dirname, '..');
const helperPath = path.join(__dirname, 'helpers/test-producer-trust.js');

test('test producer trust does not mutate require.cache or replace production exports', () => {
  const internalPath = require.resolve('../progression/producer-internal');
  const internalBefore = require(internalPath);
  const exportsBefore = Object.keys(internalBefore);
  const cacheBefore = require.cache[internalPath];
  const helper = require('./helpers/test-producer-trust');
  const internalAfter = require(internalPath);

  assert.equal(internalAfter, internalBefore);
  assert.equal(require.cache[internalPath], cacheBefore);
  assert.deepEqual(Object.keys(internalAfter), exportsBefore);
  assert.deepEqual(Object.keys(internalAfter), ['assertProducerRegistry']);
  assert.equal(typeof helper.testProgression.projection.resolveEffectiveEventGraph, 'function');
  assert.equal(fs.readFileSync(helperPath, 'utf8').includes('require.cache'), false);
});

test('test producer trust is import-order independent', () => {
  const helperFirst = `
    const assert = require('node:assert/strict');
    const helper = require('./tests/helpers/test-producer-trust');
    const internal = require('./progression/producer-internal');
    assert.deepEqual(Object.keys(internal), ['assertProducerRegistry']);
    assert.throws(() => internal.assertProducerRegistry(helper.testProducerTrust([]).registry), /TRUSTED_PRODUCER_REGISTRY_REQUIRED/);
  `;
  const productionFirst = `
    const assert = require('node:assert/strict');
    const internal = require('./progression/producer-internal');
    const before = require.cache[require.resolve('./progression/producer-internal')];
    const helper = require('./tests/helpers/test-producer-trust');
    assert.equal(require('./progression/producer-internal'), internal);
    assert.equal(require.cache[require.resolve('./progression/producer-internal')], before);
    assert.throws(() => internal.assertProducerRegistry(helper.testProducerTrust([]).registry), /TRUSTED_PRODUCER_REGISTRY_REQUIRED/);
  `;
  for (const probe of [helperFirst, productionFirst]) {
    assert.doesNotThrow(() => execFileSync(process.execPath, ['-e', probe], { cwd: backendRoot, stdio: 'pipe' }));
  }
});
