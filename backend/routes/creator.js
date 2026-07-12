const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const Tip = require('../models/Tip');

/**
 * Creator Routes
 * 
 * Handles:
 * - Creator application (apply → pending → approved on age verification)
 * - Creator dashboard (earnings, tips, stats)
 * - Creator settings
 */

// @route   POST /api/creator/apply
// @desc    Apply to become a creator
// @access  Private
router.post('/apply', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already a creator or pending
    if (user.creatorStatus !== 'none') {
      return res.status(400).json({ 
        error: `Already ${user.creatorStatus === 'pending' ? 'pending' : 'an approved'} creator` 
      });
    }

    // Set status to pending
    user.creatorStatus = 'pending';
    user.creatorApplicationDate = new Date();

    // If already age verified, approve immediately
    if (user.isAgeVerified) {
      user.creatorStatus = 'approved';
      user.isCreator = true;
      user.creatorApprovedDate = new Date();
    }

    await user.save();

    res.json({
      success: true,
      message: user.isAgeVerified 
        ? 'Creator status approved! You can now monetize content.' 
        : 'Application submitted. Complete age verification to unlock creator features.',
      creatorStatus: user.creatorStatus,
      isCreator: user.isCreator
    });
  } catch (error) {
    console.error('Creator apply error:', error);
    res.status(500).json({ error: 'Failed to apply for creator status' });
  }
});

// @route   GET /api/creator/status
// @desc    Get creator status
// @access  Private
router.get('/status', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      creatorStatus: user.creatorStatus,
      isCreator: user.isCreator,
      isAgeVerified: user.isAgeVerified,
      applicationDate: user.creatorApplicationDate,
      approvedDate: user.creatorApprovedDate
    });
  } catch (error) {
    console.error('Creator status error:', error);
    res.status(500).json({ error: 'Failed to fetch creator status' });
  }
});

// @route   GET /api/creator/earnings
// @desc    Get creator earnings dashboard
// @access  Private
router.get('/earnings', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user || !user.isCreator) {
      return res.status(403).json({ error: 'Not a creator' });
    }

    // Get all tips for this creator
    const tips = await Tip.find({ 
      creator: req.user._id,
      txStatus: 'confirmed'
    })
      .populate('sender', 'username avatar')
      .populate('post', 'title')
      .sort({ createdAt: -1 })
      .limit(100);

    // Calculate stats
    const totalEarnings = tips.reduce((sum, tip) => {
      return sum + parseFloat(tip.creatorAmount || 0);
    }, 0);

    const totalTips = tips.length;
    const avgTip = totalTips > 0 ? (totalEarnings / totalTips).toFixed(2) : '0.00';

    // Group by date for chart
    const earningsByDate = {};
    tips.forEach(tip => {
      const date = new Date(tip.createdAt).toISOString().split('T')[0];
      if (!earningsByDate[date]) {
        earningsByDate[date] = 0;
      }
      earningsByDate[date] += parseFloat(tip.creatorAmount || 0);
    });

    res.json({
      success: true,
      stats: {
        totalEarnings: totalEarnings.toFixed(2),
        totalTips,
        avgTip,
        pendingTips: await Tip.countDocuments({
          creator: req.user._id,
          txStatus: 'pending'
        })
      },
      recentTips: tips.map(tip => ({
        id: tip._id,
        from: tip.sender.username,
        fromAvatar: tip.sender.avatar,
        amount: tip.amount,
        creatorAmount: tip.creatorAmount,
        platformAmount: tip.platformAmount,
        onPost: tip.post?.title || 'Direct tip',
        message: tip.message,
        date: tip.createdAt,
        txHash: tip.txHash
      })),
      earningsByDate
    });
  } catch (error) {
    console.error('Earnings fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch earnings' });
  }
});

// @route   GET /api/creator/dashboard
// @desc    Full creator dashboard (stats + earnings + recent activity)
// @access  Private
router.get('/dashboard', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user || !user.isCreator) {
      return res.status(403).json({ error: 'Not a creator' });
    }

    // Get tips
    const tips = await Tip.find({ 
      creator: req.user._id,
      txStatus: 'confirmed'
    })
      .populate('sender', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(20);

    // Calculate earnings
    const totalEarnings = tips.reduce((sum, tip) => {
      return sum + parseFloat(tip.creatorAmount || 0);
    }, 0);

    res.json({
      success: true,
      creator: {
        username: user.username,
        avatar: user.avatar,
        bio: user.bio,
        isCreator: user.isCreator,
        followersCount: user.followersCount
      },
      earnings: {
        total: totalEarnings.toFixed(2),
        tips: tips.length,
        average: tips.length > 0 ? (totalEarnings / tips.length).toFixed(2) : '0.00',
        embeddedWallet: user.embeddedWalletAddress
      },
      recentTips: tips.map(tip => ({
        from: tip.sender.username,
        amount: tip.amount,
        creatorAmount: tip.creatorAmount,
        date: tip.createdAt
      }))
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

module.exports = router;
