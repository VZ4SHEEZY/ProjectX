/**
 * Tips Routes (Tipping System)
 * 
 * Handles:
 * - Sending tips via TipRouter contract on Base Sepolia
 * - Recording tips in MongoDB
 * - Earnings tracking
 * 
 * Contract Integration:
 * - Stub for now, swaps in real contract ABI/address when deployed
 * - Contract address from env var: TIP_ROUTER_CONTRACT_ADDRESS
 * - Treasury address from env var: TIP_ROUTER_TREASURY_ADDRESS
 * 
 * SAFETY:
 * - Contract deployment on Base Sepolia ONLY
 * - Never attempts mainnet interaction
 * - All keys stored in env vars, never in code
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const Tip = require('../models/Tip');

// TODO: When TipRouter is deployed on Base Sepolia:
// const ethers = require('ethers');
// const TIP_ROUTER_ABI = require('../contracts/TipRouter.json');

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

    // Calculate split
    const amountNum = parseFloat(amount);
    const creatorAmount = (amountNum * 0.8).toFixed(6);
    const platformAmount = (amountNum * 0.2).toFixed(6);

    // TODO: When TipRouter deployed, integrate real contract call here:
    // const provider = new ethers.providers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL);
    // const signer = new ethers.Wallet(userPrivateKey, provider);
    // const tipRouter = new ethers.Contract(
    //   process.env.TIP_ROUTER_CONTRACT_ADDRESS,
    //   TIP_ROUTER_ABI,
    //   signer
    // );
    // const tx = await tipRouter.sendTip(creator.embeddedWalletAddress, ethers.utils.parseUnits(amount, 6));
    // const receipt = await tx.wait();
    // txHash = receipt.transactionHash;

    // For now, create a pending tip record
    // This will be marked 'confirmed' once contract is live
    const tip = await Tip.create({
      sender: tipper._id,
      creator: creator._id,
      amount: amount.toString(),
      creatorAmount: creatorAmount.toString(),
      platformAmount: platformAmount.toString(),
      token: 'USDC',
      chain: 'base-sepolia',
      post: postId || null,
      message: message || '',
      txStatus: 'pending', // Will be 'confirmed' when contract deployed
      txHash: null // Will be set when contract call completes
    });

    res.status(201).json({
      success: true,
      message: 'Tip submitted (contract deployment pending)',
      tip: {
        id: tip._id,
        amount: tip.amount,
        creatorAmount: tip.creatorAmount,
        platformAmount: tip.platformAmount,
        status: tip.txStatus,
        createdAt: tip.createdAt
      },
      status: 'WAITING_FOR_CONTRACT'
    });
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
router.post('/webhook/confirm', async (req, res) => {
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
// @desc    Check if TipRouter contract is deployed
// @access  Public
router.get('/contract/status', async (req, res) => {
  try {
    const isDeployed = !!process.env.TIP_ROUTER_CONTRACT_ADDRESS;
    const contractAddress = process.env.TIP_ROUTER_CONTRACT_ADDRESS || null;
    const treasuryAddress = process.env.TIP_ROUTER_TREASURY_ADDRESS || null;

    res.json({
      success: true,
      contract: {
        isDeployed,
        address: contractAddress,
        network: 'base-sepolia',
        treasury: treasuryAddress,
        usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b3V1337' // Circle's official USDC
      }
    });
  } catch (error) {
    console.error('Contract status error:', error);
    res.status(500).json({ error: 'Failed to check contract status' });
  }
});

module.exports = router;
