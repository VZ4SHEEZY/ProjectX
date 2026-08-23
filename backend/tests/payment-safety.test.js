const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const { TipService, parseUsdcAmount } = require('../services/tip');
const Tip = require('../models/Tip');

const validEnv = {
  PAYMENT_EXECUTION_ENABLED: 'true', BASE_SEPOLIA_RPC_URL: 'https://base-sepolia.example.test/v1/test',
  USDC_SEPOLIA_ADDRESS: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  TIP_ROUTER_CONTRACT_ADDRESS: '0x1111111111111111111111111111111111111111',
  TIP_ROUTER_CODE_HASH: `0x${'a'.repeat(64)}`,
  TIP_ROUTER_TREASURY_ADDRESS: '0x2222222222222222222222222222222222222222'
};

test('malformed, sub-minimum, and over-precision amounts fail closed', () => {
  for (const amount of ['1e3', '-1', '0.001', '1.0000001', '01.00', '', 1]) assert.throws(() => parseUsdcAmount(amount));
  assert.equal(parseUsdcAmount('0.01'), 10_000n);
});

test('wrong token and recipient configuration fail closed', () => {
  const wrongToken = new TipService({ ...validEnv, USDC_SEPOLIA_ADDRESS: '0x3333333333333333333333333333333333333333' });
  assert.equal(wrongToken.validateStaticConfiguration().valid, false);
  const sameRecipient = new TipService({ ...validEnv, TIP_ROUTER_TREASURY_ADDRESS: validEnv.TIP_ROUTER_CONTRACT_ADDRESS });
  assert.equal(sameRecipient.validateStaticConfiguration().valid, false);
});

test('wrong chain and failed RPC prevent execution', async () => {
  const wrongChain = new TipService(validEnv, { getNetwork: async () => ({ chainId: 1n }) });
  await assert.rejects(wrongChain.assertExecutionEnabled(), /not Base Sepolia/);
  const failedRpc = new TipService(validEnv, { getNetwork: async () => { throw new Error('RPC unavailable'); } });
  await assert.rejects(failedRpc.assertExecutionEnabled(), /RPC unavailable/);
});

test('reverted payment is never confirmed', async () => {
  const service = new TipService(validEnv, { getTransactionReceipt: async () => ({ status: 0 }) });
  service.assertExecutionEnabled = async () => {};
  await assert.rejects(service.verifyTipTransaction({}, `0x${'a'.repeat(64)}`), /reverted/);
});

test('intent rejects wrong sender, self-payment, and treasury recipient', () => {
  const service = new TipService(validEnv);
  assert.throws(() => service.createIntent({ sender: 'bad', creator: '0x3333333333333333333333333333333333333333', amount: '1.00' }), /sender/);
  assert.throws(() => service.createIntent({ sender: validEnv.TIP_ROUTER_TREASURY_ADDRESS, creator: validEnv.TIP_ROUTER_TREASURY_ADDRESS, amount: '1.00' }), /own wallet|treasury/);
});

test('persistence has replay and duplicate transaction protections', () => {
  const indexes = Tip.schema.indexes();
  assert.ok(indexes.some(([fields, opts]) => fields.sender === 1 && fields.idempotencyKey === 1 && opts.unique));
  assert.equal(Tip.schema.path('txHash').options.unique, true);
});

test('payment intent endpoint rejects unauthorized requests', async () => {
  const app = express(); app.use(express.json()); app.use('/api/tips', require('../routes/tips'));
  const response = await request(app).post('/api/tips/intents').set('Idempotency-Key', 'abcdefghijklmnop').send({ creatorId: 'x', amount: '1.00' });
  assert.equal(response.status, 401);
});

test('frontend uses exact approval and no forbidden approval mechanisms', () => {
  const fs = require('fs');
  const source = fs.readFileSync(require('path').join(__dirname, '../../components/TipModal.tsx'), 'utf8');
  assert.match(source, /approve\(intent\.routerAddress, BigInt\(intent\.amountUnits\)\)/);
  assert.doesNotMatch(source, /MaxUint|setApprovalForAll|permit\s*\(/);
});
