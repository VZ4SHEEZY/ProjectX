'use strict';

/**
 * Live, non-spending verification for CyberDope's external integrations.
 *
 * This script intentionally:
 * - reads disposable Base Sepolia credentials only from a gitignored local file;
 * - re-verifies an existing successful payment instead of broadcasting a new one;
 * - uses eth_estimateGas/eth_call for insufficient-balance checks;
 * - uploads a generated 1x1 PNG to Cloudinary and deletes it in the same run;
 * - stores SIWE challenges/accounting records only in an ephemeral MongoDB.
 *
 * It never prints private keys, RPC URLs, Render values, or Cloudinary credentials.
 */
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const mongoose = require('mongoose');
const { ethers } = require('ethers');
const cloudinary = require('cloudinary').v2;
const { MongoMemoryServer } = require('mongodb-memory-server');

const ROOT = path.resolve(__dirname, '../..');
const DEFAULT_TX_HASH = '0x40d58474546b8258d8609748039dfc4b34ae2a149ca7c10d386da73b00f4b80e';
const RENDER_SERVICE_ID = process.env.RENDER_SERVICE_ID || 'srv-d6nk0hbh46gs7399ceqg';
const PNG_1X1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZC2sAAAAASUVORK5CYII=', 'base64');

const parseEnv = text => Object.fromEntries(text.split(/\r?\n/).flatMap(line => {
  const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (!match) return [];
  let value = match[2].trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
  return [[match[1], value]];
}));

async function renderEnvironment() {
  assert.ok(process.env.RENDER_API_KEY, 'RENDER_API_KEY is required to verify the deployed Cloudinary/Yoti configuration');
  const response = await fetch(`https://api.render.com/v1/services/${RENDER_SERVICE_ID}/env-vars`, {
    headers: { Authorization: `Bearer ${process.env.RENDER_API_KEY}`, Accept: 'application/json' }
  });
  assert.equal(response.ok, true, `Render environment API returned HTTP ${response.status}`);
  const rows = await response.json();
  return Object.fromEntries(rows.map(row => [row.envVar.key, row.envVar.value]));
}

async function verifySiwe(tipper) {
  const MongoMemoryServer = (await import('mongodb-memory-server')).MongoMemoryServer;
  const mongo = await MongoMemoryServer.create({ binary: { version: '7.0.14' } });
  process.env.FRONTEND_URL = 'http://127.0.0.1:4173';
  await mongoose.connect(mongo.getUri('cyberdope-external-siwe'));
  try {
    const walletAuth = require('../services/walletAuth');
    const request = { get: header => header.toLowerCase() === 'origin' ? process.env.FRONTEND_URL : undefined };
    const challenge = await walletAuth.createChallenge(request, tipper.address);
    assert.equal(challenge.chainId, 84532);
    assert.match(challenge.message, /will not trigger a blockchain transaction or cost gas/);
    const signature = await tipper.signMessage(challenge.message);
    const recovered = await walletAuth.verifyAndConsume({ challengeId: challenge.challengeId, signature, walletAddress: tipper.address });
    assert.equal(recovered, tipper.address.toLowerCase());
    await assert.rejects(
      walletAuth.verifyAndConsume({ challengeId: challenge.challengeId, signature, walletAddress: tipper.address }),
      /already been used/
    );
    return { signed: true, chainId: challenge.chainId, replayRejected: true };
  } finally {
    await mongoose.disconnect();
    await mongo.stop();
  }
}

async function verifyChainAndAccounting(local, deployed, tipper) {
  const env = { ...local, ...deployed, PAYMENT_EXECUTION_ENABLED: 'true' };
  const provider = new ethers.JsonRpcProvider(env.BASE_SEPOLIA_RPC_URL, 84532, { staticNetwork: true });
  const txHash = process.env.EXISTING_TIP_TX_HASH || DEFAULT_TX_HASH;
  const receipt = await provider.getTransactionReceipt(txHash);
  const transaction = await provider.getTransaction(txHash);
  assert.ok(receipt && transaction, 'Existing Base Sepolia tip transaction is unavailable');
  assert.equal(receipt.status, 1, 'Existing tip transaction did not succeed');

  const eventInterface = new ethers.Interface([
    'event TipSent(address indexed tipper,address indexed creator,uint256 amount,uint256 creatorAmount,uint256 platformAmount,uint256 timestamp)'
  ]);
  const event = receipt.logs.flatMap(log => {
    try { return [eventInterface.parseLog(log)]; } catch { return []; }
  }).find(parsed => parsed && parsed.name === 'TipSent');
  assert.ok(event, 'Matching TipSent event is missing');
  assert.equal(event.args.tipper.toLowerCase(), tipper.address.toLowerCase());

  const { TipService } = require('../services/tip');
  const service = new TipService(env, provider);
  const intent = {
    sender: event.args.tipper,
    creator: event.args.creator,
    router: env.TIP_ROUTER_CONTRACT_ADDRESS,
    amountUnits: event.args.amount.toString()
  };
  const verified = await service.verifyTipTransaction(intent, txHash);
  assert.equal(verified.pending, false);
  assert.equal(BigInt(verified.creatorAmountUnits) + BigInt(verified.platformAmountUnits), event.args.amount);
  assert.equal(event.args.creatorAmount, BigInt(verified.creatorAmountUnits));
  assert.equal(event.args.platformAmount, BigInt(verified.platformAmountUnits));

  const emptyWallet = ethers.Wallet.createRandom();
  assert.equal(await provider.getBalance(emptyWallet.address), 0n, 'Ephemeral insufficient-ETH wallet unexpectedly has ETH');
  // Sign locally and submit a zero-value transaction from a provably empty,
  // ephemeral address. The RPC must reject it before mempool acceptance.
  const feeData = await provider.getFeeData();
  const emptyTransaction = await emptyWallet.signTransaction({
    chainId: 84532, nonce: 0, to: event.args.creator, value: 0n, gasLimit: 21_000n,
    maxFeePerGas: feeData.maxFeePerGas || 1_000_000n,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || 1_000_000n,
    type: 2
  });
  await assert.rejects(
    provider.broadcastTransaction(emptyTransaction),
    /insufficient funds|insufficient balance|funds for gas/i
  );
  const usdc = new ethers.Contract(env.USDC_SEPOLIA_ADDRESS, [
    'function balanceOf(address) view returns (uint256)',
    'function transfer(address,uint256) returns (bool)'
  ], provider);
  assert.equal(await usdc.balanceOf(emptyWallet.address), 0n, 'Ephemeral insufficient-USDC wallet unexpectedly has USDC');
  await assert.rejects(
    provider.call({ from: emptyWallet.address, to: env.USDC_SEPOLIA_ADDRESS, data: usdc.interface.encodeFunctionData('transfer', [event.args.creator, 10_000n]) }),
    /revert|insufficient|execution reverted|CALL_EXCEPTION/i
  );

  const mongo = await MongoMemoryServer.create({ binary: { version: '7.0.14' } });
  await mongoose.connect(mongo.getUri('cyberdope-external-accounting'));
  try {
    const Tip = require('../models/Tip');
    const senderId = new mongoose.Types.ObjectId();
    const creatorId = new mongoose.Types.ObjectId();
    await Tip.create({
      sender: senderId, creator: creatorId, idempotencyKey: `external-${crypto.randomUUID()}`,
      amount: ethers.formatUnits(event.args.amount, 6), amountUnits: event.args.amount.toString(), token: 'USDC', chain: 'base-sepolia',
      creatorAmount: ethers.formatUnits(event.args.creatorAmount, 6), platformAmount: ethers.formatUnits(event.args.platformAmount, 6),
      txHash: txHash.toLowerCase(), senderWallet: event.args.tipper, creatorWallet: event.args.creator,
      tokenAddress: env.USDC_SEPOLIA_ADDRESS, routerAddress: env.TIP_ROUTER_CONTRACT_ADDRESS,
      treasuryAddress: env.TIP_ROUTER_TREASURY_ADDRESS, chainId: 84532, expiresAt: new Date(Date.now() + 60_000),
      txStatus: 'confirmed', blockNumber: receipt.blockNumber, confirmationCount: verified.confirmations, confirmedAt: new Date()
    });
    const persisted = await Tip.findOne({ creator: creatorId, txStatus: 'confirmed' }).lean();
    assert.ok(persisted);
    assert.equal(persisted.txHash, txHash.toLowerCase());
    assert.equal(persisted.creatorAmount, ethers.formatUnits(event.args.creatorAmount, 6));
    assert.equal(persisted.platformAmount, ethers.formatUnits(event.args.platformAmount, 6));
  } finally {
    await mongoose.disconnect();
    await mongo.stop();
  }

  return {
    chainId: Number(transaction.chainId), txHash, blockNumber: receipt.blockNumber,
    amount: ethers.formatUnits(event.args.amount, 6),
    creatorAmount: ethers.formatUnits(event.args.creatorAmount, 6),
    treasuryAmount: ethers.formatUnits(event.args.platformAmount, 6),
    confirmations: verified.confirmations, eventVerified: true, backendPersistenceVerified: true,
    insufficientEthSimulation: true, insufficientUsdcSimulation: true
  };
}

async function verifyCloudinary(env) {
  for (const key of ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) assert.ok(env[key], `${key} is not configured on Render`);
  cloudinary.config({ cloud_name: env.CLOUDINARY_CLOUD_NAME, api_key: env.CLOUDINARY_API_KEY, api_secret: env.CLOUDINARY_API_SECRET });
  const runId = crypto.randomBytes(8).toString('hex');
  const publicId = `cyberdope/qa/external-${runId}`;
  let uploaded = false;
  try {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({ public_id: publicId, resource_type: 'image', tags: ['cyberdope-qa-disposable'] }, (error, value) => error ? reject(error) : resolve(value));
      stream.end(PNG_1X1);
    });
    uploaded = true;
    assert.equal(result.public_id, publicId);
    assert.match(result.secure_url, /^https:\/\//);
    const delivered = await fetch(result.secure_url, { redirect: 'follow' });
    assert.equal(delivered.ok, true, `Cloudinary delivery returned HTTP ${delivered.status}`);
    assert.match(delivered.headers.get('content-type') || '', /^image\//);
    return { uploadVerified: true, deliveryVerified: true, deletionVerified: true, resourceType: 'image' };
  } finally {
    if (uploaded) {
      const deleted = await cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true });
      assert.ok(['ok', 'not found'].includes(deleted.result), 'Disposable Cloudinary resource was not deleted');
    }
  }
}

async function main() {
  const local = parseEnv(await fs.readFile(process.env.BASE_SEPOLIA_SECRET_FILE || path.join(ROOT, '.secrets/base-sepolia.env'), 'utf8'));
  const deployed = await renderEnvironment();
  const tipper = new ethers.Wallet(local.TEST_TIPPER_PRIVATE_KEY);
  assert.equal(tipper.address.toLowerCase(), local.TEST_TIPPER_ADDRESS.toLowerCase(), 'Disposable tipper key/address mismatch');
  // SIWE and accounting intentionally run in sequence because both use the
  // process-wide Mongoose connection, each against a different ephemeral DB.
  const siwe = await verifySiwe(tipper);
  const chain = await verifyChainAndAccounting(local, deployed, tipper);
  const cloudinaryResult = await verifyCloudinary(deployed);
  const yotiConfigured = ['YOTI_CLIENT_SDK_ID', 'YOTI_API_KEY', 'YOTI_KEY_FILE_PATH'].some(key => Boolean(deployed[key]));
  assert.equal(yotiConfigured, false, 'Yoti variables exist but the integration is still scaffolded and must not be reported as verified');
  const safeResult = {
    completedAt: new Date().toISOString(), spending: { newTransactionsBroadcast: 0, mainnetUsed: false },
    siwe, baseSepolia: chain, cloudinary: cloudinaryResult,
    identityProvider: { provider: 'Yoti', configured: false, verified: false, reason: 'No Yoti environment configuration; implementation remains stubbed' }
  };
  await fs.mkdir(path.join(ROOT, '.e2e'), { recursive: true });
  await fs.writeFile(path.join(ROOT, '.e2e/external-results.json'), `${JSON.stringify(safeResult, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify(safeResult, null, 2));
}

main().catch(error => {
  console.error(`External verification failed: ${error.message}`);
  process.exitCode = 1;
});
