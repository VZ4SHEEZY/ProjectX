const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const { ethers } = require('ethers');

process.env.FRONTEND_URL = 'https://project-x-sage-nine.vercel.app';
process.env.JWT_SECRET = 'wallet-auth-test-secret-that-is-long-enough';

const WalletChallenge = require('../models/WalletChallenge');
const walletAuth = require('../services/walletAuth');
const tipService = require('../services/tip');
const walletRouter = require('../routes/wallet');

let record;
const original = { findOne: WalletChallenge.findOne, findOneAndUpdate: WalletChallenge.findOneAndUpdate };

test.afterEach(() => {
  WalletChallenge.findOne = original.findOne;
  WalletChallenge.findOneAndUpdate = original.findOneAndUpdate;
  record = undefined;
});

const makeChallenge = async (wallet, overrides = {}) => {
  const issuedAt = new Date();
  const expiresAt = new Date(Date.now() + 60_000);
  const values = {
    domain: 'project-x-sage-nine.vercel.app',
    uri: 'https://project-x-sage-nine.vercel.app/',
    address: wallet.address.toLowerCase(), chainId: 84532, nonce: 'abcdef1234567890',
    issuedAt: issuedAt.toISOString(), expirationTime: expiresAt.toISOString(), ...overrides
  };
  record = {
    _id: 'challenge-object-id', challengeId: 'challenge-id', usedAt: null,
    expiresAt, ...values,
    message: walletAuth.buildMessage(values)
  };
  WalletChallenge.findOne = async ({ challengeId }) => challengeId === record.challengeId ? record : null;
  WalletChallenge.findOneAndUpdate = async () => {
    if (record.usedAt || record.expiresAt <= new Date()) return null;
    record.usedAt = new Date(); return record;
  };
  return { challengeId: record.challengeId, walletAddress: wallet.address, signature: await wallet.signMessage(record.message) };
};

test('accepts a valid Base Sepolia domain-bound signature', async () => {
  const wallet = ethers.Wallet.createRandom();
  const payload = await makeChallenge(wallet);
  assert.equal(await walletAuth.verifyAndConsume(payload), wallet.address.toLowerCase());
  assert.ok(record.usedAt);
});

test('rejects a signature submitted for the wrong wallet', async () => {
  const payload = await makeChallenge(ethers.Wallet.createRandom());
  payload.walletAddress = ethers.Wallet.createRandom().address;
  await assert.rejects(walletAuth.verifyAndConsume(payload), /does not match challenge/);
});

test('rejects a challenge for the wrong domain', async () => {
  const payload = await makeChallenge(ethers.Wallet.createRandom(), { domain: 'evil.example' });
  await assert.rejects(walletAuth.verifyAndConsume(payload), /domain, URI, or chain/);
});

test('rejects a challenge for the wrong chain', async () => {
  const payload = await makeChallenge(ethers.Wallet.createRandom(), { chainId: 8453 });
  await assert.rejects(walletAuth.verifyAndConsume(payload), /domain, URI, or chain/);
});

test('rejects an expired challenge', async () => {
  const payload = await makeChallenge(ethers.Wallet.createRandom());
  record.expiresAt = new Date(Date.now() - 1);
  await assert.rejects(walletAuth.verifyAndConsume(payload), /expired/);
});

test('rejects a reused nonce', async () => {
  const wallet = ethers.Wallet.createRandom();
  const payload = await makeChallenge(wallet);
  await walletAuth.verifyAndConsume(payload);
  await assert.rejects(walletAuth.verifyAndConsume(payload), /already been used/);
});

test('rejects a malformed signature', async () => {
  const payload = await makeChallenge(ethers.Wallet.createRandom());
  payload.signature = 'not-a-signature';
  await assert.rejects(walletAuth.verifyAndConsume(payload), /Malformed wallet signature/);
});

test('wallet binding rejects unauthenticated requests', async () => {
  const app = express(); app.use(express.json()); app.use('/api/wallet', walletRouter);
  const response = await request(app).post('/api/wallet/connect').send({});
  assert.equal(response.status, 401);
});

test('wallet status exposes verified payment configuration', async (t) => {
  const originalExecutionRequested = tipService.executionRequested;
  const originalVerifyConfiguration = tipService.verifyConfiguration;
  const originalGetStatus = tipService.getStatus;
  t.after(() => {
    tipService.executionRequested = originalExecutionRequested;
    tipService.verifyConfiguration = originalVerifyConfiguration;
    tipService.getStatus = originalGetStatus;
  });
  tipService.executionRequested = true;
  tipService.verifyConfiguration = async () => ({ chainId: 84532 });
  tipService.getStatus = () => ({ configured: true, paymentExecutionEnabled: true, chainId: 84532, network: 'base-sepolia' });

  const app = express(); app.use('/api/wallet', walletRouter);
  const response = await request(app).get('/api/wallet/status');
  assert.equal(response.status, 200);
  assert.equal(response.body.configured, true);
  assert.equal(response.body.paymentExecutionEnabled, true);
  assert.equal(response.body.chain, 'base-sepolia');
  assert.equal(response.body.chainId, 84532);
});
