/**
 * Tips Routes (Tipping System)
 * 
 * Handles:
 * - Sending tips via TipRouter contract on Base Sepolia
 * - Recording tips in MongoDB
 * - Earnings tracking
 * 
 * Contract Integration:
 * - Uses TipRouter service for real USDC transfers
 * - Checks USDC allowance before sending tip
 * - Returns needApproval flag if approval required
 * 
 * SAFETY:
 * - Contract deployment on Base Sepolia ONLY
 * - Never attempts mainnet interaction
 * - All keys stored in env vars, never in code
 */

const express = require('express');
const { ethers } = require('ethers');
const router = express.Router();
const { protect, requireAgeVerified } = require('../middleware/auth');
const crypto = require('crypto');

const requireWebhookSecret = (req, res, next) => {
  const expected = process.env.TIP_WEBHOOK_SECRET;
  const provided = req.get('x-webhook-secret');
  if (!expected || !provided) {
    return res.status(401).json({ error: 'Webhook authentication required' });
  }
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  if (expectedBuffer.length !== providedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, providedBuffer)) {
    return res.status(401).json({ error: 'Webhook authentication required' });
  }
  next();
};
const User = require('../models/User');
const Tip = require('../models/Tip');
const tipService = require('../services/tip');


// @route   POST /api/tips/approve
// @desc    Approve TipRouter to spend the tipper's USDC (Base Sepolia)
// @access  Private (age verified only)
router.post('/approve', protect, requireAgeVerified, async (req, res) => {
  try {
    const requestedAmount = req.body && req.body.amount;
    const amount = requestedAmount === undefined ? 1000 : Number(requestedAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive USDC value' });
    }

    const owner = req.user.embeddedWalletAddress || req.user.externalWalletAddress;
    if (!owner || !ethers.isAddress(owner)) {
      return res.status(400).json({ error: 'Tipper has no valid connected wallet' });
    }

    const privateKey = process.env.TIP_ROUTER_PRIVATE_KEY;
    if (!privateKey) {
      return res.status(500).json({ error: 'TipRouter private key is not configured' });
    }

    // ERC-20 approve always applies to the transaction signer (the owner).
    let signerAddress;
    try {
      signerAddress = new ethers.Wallet(privateKey).address;
    } catch (error) {
      return res.status(500).json({ error: 'TipRouter private key is invalid' });
    }

    if (signerAddress.toLowerCase() !== owner.toLowerCase()) {
      return res.status(403).json({
        error: 'Configured signing wallet does not match the tipper wallet'
      });
    }

    const approval = await tipService.approveTipRouter(privateKey, amount);

    return res.json({ success: true, txHash: approval.txHash });
  } catch (error) {
    console.error('Approve tip transaction error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to approve USDC for TipRouter'
    });
  }
});


// @route   POST /api/tips/send
// @desc    Send a tip via contract (Base Sepolia)
// @access  Private (age verified only)
router.post('/send', protect, async (req, res) => {
  try {
    const { creatorId, amount, message, postId } = req.body;

    if (!creatorId || !amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Invalid creator or amount' });
    }

    const tipper = await User.findById(req.user._id);
    const creator = await User.findById(creatorId);

    if (!tipper) return res.status(404).json({ error: 'Tipper not found' });
    if (!creator) return res.status(404).json({ error: 'Creator not found' });

    // Age verification check
    if (!tipper.isAgeVerified) {
      return res.status(403).json({ error: 'Age verification required to send tips' });
    }

    const amountNum = parseFloat(amount);
    
    // Validate tip parameters (minimum $0.01)
    const validation = tipService.validateTip(req.user._id, creatorId, amountNum);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.errors.join(', ') });
    }

    // Get wallet addresses
    const tipperWallet = tipper.embeddedWalletAddress || tipper.externalWalletAddress;
    if (!tipperWallet) {
      return res.status(400).json({ 
        error: 'Tipper has no connected wallet',
        needWallet: true 
      });
    }

    const creatorWallet = creator.embeddedWalletAddress || creator.externalWalletAddress;
    if (!creatorWallet) {
      return res.status(400).json({
        error: 'Creator has no wallet set up',
        needCreatorWallet: true
      });
    }

    // Check USDC allowance for TipRouter contract
    let allowance;
    try {
      allowance = await tipService.getAllowance(tipperWallet);
    } catch (error) {
      console.warn('Failed to get allowance:', error.message);
      return res.status(500).json({ error: 'Failed to check wallet balance' });
    }

    // If allowance insufficient, require approval first
    if (parseFloat(allowance) < amountNum) {
      return res.status(402).json({
        success: false,
        needApproval: true,
        currentAllowance: parseFloat(allowance),
        requiredAmount: amountNum,
        message: `Approve TipRouter for ${amountNum} USDC first`
      });
    }

    // Get private key from environment (for signing)
    const privateKey = process.env.TIP_ROUTER_PRIVATE_KEY;
    
    if (!privateKey) {
      return res.status(500).json({
        error: 'TipRouter private key not configured',
        needConfig: true
      });
    }

    // Attempt to send tip via TipRouter contract
    let txReceipt;
    try {
      txReceipt = await tipService.sendTip(privateKey, creatorWallet, amountNum);
      
      // Record successful tip in MongoDB
      const tip = await Tip.create({
        sender: tipper._id,
        creator: creator._id,
        amount: amount.toString(),
        creatorAmount: (amountNum * 0.8).toFixed(6),
        platformAmount: (amountNum * 0.2).toFixed(6),
        token: 'USDC',
        chain: 'base-sepolia',
        post: postId || null,
        message: message || '',
        txStatus: 'confirmed',
        txHash: txReceipt.txHash
      });

      res.status(201).json({
        success: true,
        message: 'Tip sent successfully',
        tip: {
          id: tip._id,
          amount: tip.amount,
          creatorAmount: tip.creatorAmount,
          platformAmount: tip.platformAmount,
          status: tip.txStatus,
          txHash: tip.txHash,
          createdAt: tip.createdAt
        }
      });
    } catch (error) {
      console.error('Send tip transaction error:', error);
      
      // Record failed attempt for debugging
      const failedTip = await Tip.create({
        sender: tipper._id,
        creator: creator._id,
        amount: amount.toString(),
        creatorAmount: (amountNum * 0.8).toFixed(6),
        platformAmount: (amountNum * 0.2).toFixed(6),
        token: 'USDC',
        chain: 'base-sepolia',
        post: postId || null,
        message: message || '',
        txStatus: 'failed',
        failureReason: error.message
      });

      res.status(500).json({
        success: false,
        error: 'Transaction failed on chain',
        tipId: failedTip._id,
        failureReason: error.message
      });
    }
  } catch (error) {
    console.error('Send tip error:', error);
    res.status(500).json({ error: 'Failed to send tip' });
  }
});

// @route   GET /api/tips/creator/:creatorId
// @desc    Get all tips to a creator
// @access  Public
router.get('/creator/:creatorId', async (req, res) => {
  try {
    const { creatorId } = req.params;

    const tips = await Tip.find({
      creator: creatorId,
      txStatus: 'confirmed'
    })
      .populate('sender', 'username avatar')
      .sort({ createdAt: -1 });

    const totalEarnings = tips.reduce((sum, tip) => {
      return sum + parseFloat(tip.creatorAmount || 0);
    }, 0);

    res.json({
      success: true,
      creatorId,
      totalEarnings: totalEarnings.toFixed(2),
      totalTips: tips.length,
      tips: tips.map(tip => ({
        id: tip._id,
        from: tip.sender.username,
        amount: tip.amount,
        creatorAmount: tip.creatorAmount,
        message: tip.message,
        date: tip.createdAt,
        txHash: tip.txHash
      }))
    });
  } catch (error) {
    console.error('Get tips error:', error);
    res.status(500).json({ error: 'Failed to fetch tips' });
  }
});

// @route   GET /api/tips/user
// @desc    Get all tips sent by current user
// @access  Private
router.get('/user', protect, async (req, res) => {
  try {
    const tips = await Tip.find({
      sender: req.user._id
    })
      .populate('creator', 'username avatar')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      totalSent: tips.length,
      totalAmount: tips.reduce((sum, tip) => sum + parseFloat(tip.amount || 0), 0).toFixed(2),
      tips: tips.map(tip => ({
        id: tip._id,
        to: tip.creator.username,
        amount: tip.amount,
        status: tip.txStatus,
        date: tip.createdAt
      }))
    });
  } catch (error) {
    console.error('Get user tips error:', error);
    res.status(500).json({ error: 'Failed to fetch tips' });
  }
});

// @route   POST /api/tips/webhook/confirm
// @desc    Webhook: confirm tip when contract tx is included in block
// @access  Private (should be called from backend job/listener)
router.post('/webhook/confirm', requireWebhookSecret, async (req, res) => {
  try {
    const { tipId, txHash, blockNumber, status } = req.body;

    if (!tipId || !txHash) {
      return res.status(400).json({ error: 'Tip ID and tx hash required' });
    }

    const tip = await Tip.findByIdAndUpdate(tipId, {
      txHash,
      txStatus: status === 'success' ? 'confirmed' : 'failed',
      confirmedAt: new Date(),
      failureReason: status === 'success' ? null : 'Transaction failed on chain'
    }, { new: true });

    if (!tip) {
      return res.status(404).json({ error: 'Tip not found' });
    }

    res.json({
      success: true,
      tip: {
        id: tip._id,
        status: tip.txStatus,
        txHash: tip.txHash
      }
    });
  } catch (error) {
    console.error('Confirm tip error:', error);
    res.status(500).json({ error: 'Failed to confirm tip' });
  }
});

// @route   GET /api/tips/contract/status
// @desc    Check if TipRouter service is configured
// @access  Public
router.get('/contract/status', async (req, res) => {
  try {
    const status = tipService.getStatus();
    
    res.json({
      success: true,
      contract: status,
      note: status.configured ? 'TipRouter is ready for use' : 'Configure env vars to enable tipping'
    });
  } catch (error) {
    console.error('Contract status error:', error);
    res.status(500).json({ error: 'Failed to check contract status' });
  }
});

module.exports = router;
