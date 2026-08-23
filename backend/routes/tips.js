const express = require('express');
const crypto = require('crypto');
const { ethers } = require('ethers');
const { protect, requireAgeVerified } = require('../middleware/auth');
const User = require('../models/User');
const Tip = require('../models/Tip');
const tipService = require('../services/tip');

const router = express.Router();
const INTENT_TTL_MS = 15 * 60 * 1000;

const requireWebhookSecret = (req, res, next) => {
  const expected = process.env.TIP_WEBHOOK_SECRET || '';
  const provided = req.get('x-webhook-secret') || '';
  const a = Buffer.from(expected); const b = Buffer.from(provided);
  if (!expected || !provided || a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(401).json({ error: 'Webhook authentication required' });
  next();
};
const walletFor = user => user.externalWalletAddress || user.embeddedWalletAddress || user.walletAddress;
const publicTip = tip => ({ id: tip._id, amount: tip.amount, status: tip.txStatus, txHash: tip.txHash, chainId: tip.chainId, createdAt: tip.createdAt });

async function confirmTip(tip, txHash) {
  if (tip.txHash && tip.txHash.toLowerCase() !== txHash.toLowerCase()) throw new Error('Intent is already bound to a different transaction');
  const result = await tipService.verifyTipTransaction(tip.toObject ? tip.toObject() : tip, txHash);
  tip.txHash = txHash.toLowerCase();
  if (result.pending) {
    tip.txStatus = 'pending'; tip.confirmationCount = result.confirmations || 0;
  } else {
    tip.txStatus = 'confirmed'; tip.blockNumber = result.blockNumber; tip.confirmationCount = result.confirmations; tip.confirmedAt = new Date(); tip.failureReason = undefined;
  }
  await tip.save();
  return { result, tip };
}

router.post('/intents', protect, requireAgeVerified, async (req, res) => {
  try {
    await tipService.assertExecutionEnabled();
    const key = req.get('idempotency-key');
    if (!key || !/^[A-Za-z0-9_-]{16,128}$/.test(key)) return res.status(400).json({ error: 'A valid Idempotency-Key header is required' });
    const existing = await Tip.findOne({ sender: req.user._id, idempotencyKey: key });
    if (existing) return res.json({ success: true, reused: true, intent: existing, allowance: (await tipService.getAllowance(existing.senderWallet)).toString() });

    const [tipper, creator] = await Promise.all([User.findById(req.user._id), User.findById(req.body.creatorId)]);
    if (!tipper || !creator) return res.status(404).json({ error: 'Tipper or creator not found' });
    const sender = walletFor(tipper); const recipient = walletFor(creator);
    const intent = tipService.createIntent({ sender, creator: recipient, amount: req.body.amount });
    const creatorUnits = (BigInt(intent.amountUnits) * 8000n) / 10000n;
    const tip = await Tip.create({
      sender: tipper._id, creator: creator._id, post: req.body.postId || null,
      message: String(req.body.message || '').slice(0, 500), idempotencyKey: key,
      amount: intent.amount, amountUnits: intent.amountUnits, creatorAmount: ethers.formatUnits(creatorUnits, 6),
      platformAmount: ethers.formatUnits(BigInt(intent.amountUnits) - creatorUnits, 6), token: 'USDC', chain: 'base-sepolia',
      chainId: intent.chainId, tokenAddress: intent.token, routerAddress: intent.router, treasuryAddress: intent.treasury,
      senderWallet: intent.sender, creatorWallet: intent.creator, expiresAt: new Date(Date.now() + INTENT_TTL_MS), txStatus: 'pending'
    });
    const allowance = await tipService.getAllowance(intent.sender);
    return res.status(201).json({ success: true, intent: tip, allowance: allowance.toString(), approvalRequired: allowance !== BigInt(intent.amountUnits) });
  } catch (error) {
    const status = error.name === 'PaymentConfigurationError' ? 503 : error.code === 11000 ? 409 : 400;
    return res.status(status).json({ error: error.message || 'Unable to prepare tip' });
  }
});

router.post('/intents/:id/confirm', protect, requireAgeVerified, async (req, res) => {
  try {
    const tip = await Tip.findOne({ _id: req.params.id, sender: req.user._id });
    if (!tip) return res.status(404).json({ error: 'Tip intent not found' });
    if (tip.txStatus === 'confirmed') return res.json({ success: true, duplicate: true, tip: publicTip(tip) });
    if (tip.expiresAt < new Date() && !tip.txHash) return res.status(410).json({ error: 'Tip intent expired' });
    const { result } = await confirmTip(tip, req.body.txHash);
    return res.status(result.pending ? 202 : 200).json({ success: !result.pending, pending: result.pending, tip: publicTip(tip) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'Transaction was already used for another payment' });
    return res.status(error.name === 'PaymentConfigurationError' ? 503 : 400).json({ error: error.message || 'Unable to verify transaction' });
  }
});

router.post('/webhook/confirm', requireWebhookSecret, async (req, res) => {
  try {
    const tip = await Tip.findById(req.body.tipId);
    if (!tip) return res.status(404).json({ error: 'Tip not found' });
    const { result } = await confirmTip(tip, req.body.txHash);
    return res.status(result.pending ? 202 : 200).json({ success: !result.pending, pending: result.pending, tip: publicTip(tip) });
  } catch (error) { return res.status(400).json({ error: error.message || 'Unable to verify transaction' }); }
});

router.get('/creator/:creatorId', async (req, res) => {
  try {
    const tips = await Tip.find({ creator: req.params.creatorId, txStatus: 'confirmed' }).populate('sender', 'username avatar').sort({ createdAt: -1 });
    const totalUnits = tips.reduce((sum, tip) => sum + BigInt(tip.amountUnits || '0'), 0n);
    return res.json({ success: true, creatorId: req.params.creatorId, totalEarnings: ethers.formatUnits(totalUnits, 6), totalTips: tips.length, tips });
  } catch { return res.status(500).json({ error: 'Failed to fetch tips' }); }
});

router.get('/user', protect, async (req, res) => {
  try { const tips = await Tip.find({ sender: req.user._id }).populate('creator', 'username avatar').sort({ createdAt: -1 }); return res.json({ success: true, tips }); }
  catch { return res.status(500).json({ error: 'Failed to fetch tips' }); }
});

router.get('/contract/status', async (_req, res) => {
  try {
    if (tipService.executionRequested) await tipService.verifyConfiguration();
    return res.json({ success: true, contract: tipService.getStatus() });
  } catch (error) { return res.status(503).json({ success: false, contract: tipService.getStatus(), error: error.message }); }
});

module.exports = router;
