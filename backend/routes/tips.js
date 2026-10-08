const express = require('express');
const crypto = require('crypto');
const { ethers } = require('ethers');
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const Tip = require('../models/Tip');
const tipService = require('../services/tip');
const { canViewProfile, canViewPost } = require('../services/accessPolicy');
const Post = require('../models/Post');
const { withProgressionOutbox } = require('../progression/runtime/outbox');

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
const publicTip = tip => ({ failureReason: tip.failureReason || null, id: tip._id, amount: tip.amount, status: tip.txStatus, txHash: tip.txHash, chainId: tip.chainId, createdAt: tip.createdAt });

async function confirmTip(tip, txHash) {
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash || '')) throw new Error('Malformed transaction hash');
  if (tip.txHash && tip.txHash.toLowerCase() !== txHash.toLowerCase()) throw new Error('Intent is already bound to a different transaction');
  if (tip.txStatus === 'confirmed') return { result: { pending: false }, tip };
  if (tip.txStatus === 'failed') throw new Error(tip.failureReason || 'Transaction failed');
  let result;
  try { result = await tipService.verifyTipTransaction({ sender: tip.senderWallet, creator: tip.creatorWallet, router: tip.routerAddress, amountUnits: tip.amountUnits }, txHash); }
  catch (error) {
    if (error.code === 'TIP_REVERTED') { tip.txHash = txHash.toLowerCase(); tip.txStatus = 'failed'; tip.failureReason = 'Transaction reverted on Base Sepolia'; tip.failedAt = new Date(); await tip.save(); }
    throw error;
  }
  const normalizedHash = txHash.toLowerCase();
  if (result.pending) {
    const updated = await Tip.findOneAndUpdate({ _id: tip._id, txStatus: 'pending', $or: [{ txHash: { $exists: false } }, { txHash: normalizedHash }] }, { txHash: normalizedHash, confirmationCount: result.confirmations || 0 }, { new: true });
    if (!updated) { const current = await Tip.findById(tip._id); if (current?.txStatus === 'confirmed' && current.txHash === normalizedHash) return { result: { pending: false }, tip: current }; throw new Error('Intent is already bound to another transaction'); }
    tip = updated;
  } else {
    tip = await withProgressionOutbox(async ({ session, enqueue }) => {
      const current = await Tip.findById(tip._id).session(session);
      if (current.txHash && current.txHash !== normalizedHash) throw new Error('Intent is already bound to another transaction');
      if (current.txStatus === 'confirmed') return current;
      if (current.txStatus === 'failed') throw new Error('Transaction failed');
      current.txHash = normalizedHash; current.txStatus = 'confirmed'; current.blockNumber = result.blockNumber;
      current.confirmationCount = result.confirmations; current.confirmedAt = new Date(); current.failureReason = undefined;
      await current.save({ session });
      const observedAt = current.confirmedAt;
      await enqueue({
        principal: 'payments', eventType: 'economy.support.final', activityClass: 'TRANSACT', actorId: current.sender, beneficiaryId: current.creator,
        occurredAt: observedAt, subject: { type: 'user', id: String(current.creator) }, object: { type: 'transaction', id: normalizedHash }, sourceEventId: normalizedHash,
        source: { objectType: 'tip', objectId: current._id, transition: 'finalized', version: `${current.chainId}:${result.blockNumber}` },
        economic: { amountMinor: current.amountUnits, currency: current.token, state: 'finalized' },
        evidence: [{ type: 'economic_finality', contractVersion: '1.0.0', subject: { type: 'transaction', id: normalizedHash }, generation: '1', confidence: 1,
          lineage: [`tip:${current._id}`, `tx:${normalizedHash}`], privacyClassification: 'restricted', retentionClass: 'audit',
          body: { state: 'finalized', authorityRef: 'payment-service', transactionRef: normalizedHash, blockRef: String(result.blockNumber), confirmationDepth: result.confirmations,
            amountMinor: current.amountUnits, currency: current.token, payerId: String(current.sender), beneficiaryId: String(current.creator), recipientId: String(current.creator), direction: 'payer_to_beneficiary', amountSign: 'non_negative_magnitude' } }]
      });
      return current;
    });
  }
  return { result, tip };
}

router.post('/intents', protect, async (req, res) => {
  try {
    await tipService.assertExecutionEnabled();
    const key = req.get('idempotency-key');
    if (!key || !/^[A-Za-z0-9_-]{16,128}$/.test(key)) return res.status(400).json({ error: 'A valid Idempotency-Key header is required' });
    const existing = await Tip.findOne({ sender: req.user._id, idempotencyKey: key });
    if (existing) {
      if (existing.expiresAt < new Date() || existing.txStatus !== 'pending' || existing.txHash) return res.status(409).json({ error: 'Intent already submitted or expired; check its receipt' });
      const allowance = await tipService.getAllowance(existing.senderWallet);
      return res.json({ success: true, reused: true, intent: existing, allowance: allowance.toString(), approvalRequired: allowance !== BigInt(existing.amountUnits) });
    }

    const [tipper, creator] = await Promise.all([User.findById(req.user._id), User.findById(req.body.creatorId)]);
    if (!tipper || !creator) return res.status(404).json({ error: 'Tipper or creator not found' });
    if (!creator.isCreator || !(await canViewProfile(tipper, creator)).allowed) return res.status(403).json({ error: 'Creator is unavailable' });
    if (req.body.postId) {
      const post = await Post.findById(req.body.postId).populate('author');
      if (!post || String(post.author?._id) !== String(creator._id) || !(await canViewPost(tipper, post)).allowed) return res.status(403).json({ error: 'Content is unavailable' });
    }
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

router.get('/intents/:id', protect, async (req, res) => {
  try { const tip = await Tip.findOne({ _id: req.params.id, sender: req.user._id }); if (!tip) return res.status(404).json({ error: 'Receipt not found' }); return res.json({ success: true, tip: publicTip(tip) }); }
  catch { return res.status(400).json({ error: 'Invalid receipt' }); }
});

router.post('/intents/:id/confirm', protect, async (req, res) => {
  try {
    const tip = await Tip.findOne({ _id: req.params.id, sender: req.user._id });
    if (!tip) return res.status(404).json({ error: 'Tip intent not found' });
    if (tip.txStatus === 'confirmed') {
      if (!req.body.txHash || tip.txHash.toLowerCase() !== req.body.txHash.toLowerCase()) return res.status(409).json({ error: 'Confirmed intent cannot be replayed with another transaction' });
      return res.json({ success: true, duplicate: true, tip: publicTip(tip) });
    }
    if (tip.expiresAt < new Date() && !tip.txHash) return res.status(410).json({ error: 'Tip intent expired' });
    const { result, tip: receipt } = await confirmTip(tip, req.body.txHash);
    return res.status(result.pending ? 202 : 200).json({ success: !result.pending, pending: result.pending, tip: publicTip(receipt) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'Transaction was already used for another payment' });
    return res.status(error.name === 'PaymentConfigurationError' ? 503 : 400).json({ error: error.message || 'Unable to verify transaction' });
  }
});

router.post('/webhook/confirm', requireWebhookSecret, async (req, res) => {
  try {
    const tip = await Tip.findById(req.body.tipId);
    if (!tip) return res.status(404).json({ error: 'Tip not found' });
    const { result, tip: receipt } = await confirmTip(tip, req.body.txHash);
    return res.status(result.pending ? 202 : 200).json({ success: !result.pending, pending: result.pending, tip: publicTip(receipt) });
  } catch (error) { return res.status(400).json({ error: error.message || 'Unable to verify transaction' }); }
});

router.get('/creator/:creatorId', protect, async (req, res) => {
  try {
    if (String(req.user._id) !== req.params.creatorId) return res.status(403).json({ error: 'Private creator receipts' });
    const tips = await Tip.find({ creator: req.params.creatorId, txStatus: 'confirmed' }).sort({ createdAt: -1 }).limit(100);
    return res.json({ success: true, tips: tips.map(publicTip) });
  } catch { return res.status(500).json({ error: 'Failed to fetch tips' }); }
});

router.get('/user', protect, async (req, res) => {
  try { const tips = await Tip.find({ sender: req.user._id }).sort({ createdAt: -1 }).limit(100); return res.json({ success: true, tips: tips.map(publicTip) }); }
  catch { return res.status(500).json({ error: 'Failed to fetch tips' }); }
});

router.get('/contract/status', async (_req, res) => {
  try {
    if (tipService.executionRequested) await tipService.verifyConfiguration();
    return res.json({ success: true, contract: tipService.getStatus() });
  } catch (error) { return res.status(503).json({ success: false, contract: tipService.getStatus(), error: error.message }); }
});

module.exports = router;
