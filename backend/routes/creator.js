const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const Tip = require('../models/Tip');

const MAX_SUBSCRIPTION_TIERS = 6;
const ALLOWED_TIER_ICONS = new Set(['users', 'star', 'crown', 'zap']);
const ALLOWED_TIER_COLORS = new Set(['gray', '[#39FF14]', 'yellow', 'purple']);

const serializeTier = (tier) => ({
  id: tier._id.toString(),
  name: tier.name,
  price: tier.price,
  description: tier.description || '',
  benefits: tier.benefits || [],
  color: tier.color || 'gray',
  icon: tier.icon || 'star',
  isActive: tier.isActive
});

const validateTiers = (tiers) => {
  if (!Array.isArray(tiers) || tiers.length > MAX_SUBSCRIPTION_TIERS) {
    return `Subscription tiers must be an array with at most ${MAX_SUBSCRIPTION_TIERS} entries`;
  }

  for (const tier of tiers) {
    if (!tier || typeof tier.name !== 'string' || !tier.name.trim() || tier.name.trim().length > 60) {
      return 'Every tier needs a name between 1 and 60 characters';
    }
    if (!Number.isFinite(tier.price) || tier.price < 0 || tier.price > 1000) {
      return 'Every tier price must be between 0 and 1000';
    }
    if (typeof tier.description !== 'string' || tier.description.length > 300) {
      return 'Tier descriptions cannot exceed 300 characters';
    }
    if (!Array.isArray(tier.benefits) || tier.benefits.length > 20 ||
        tier.benefits.some(benefit => typeof benefit !== 'string' || !benefit.trim() || benefit.length > 100)) {
      return 'Each tier can have up to 20 benefits of 100 characters each';
    }
  }

  return null;
};

/**
 * Creator Routes
 * 
 * Verification Tiers (SEPARATE CONCERNS):
 * - isAgeVerified: User can VIEW 18+ content (viewer check)
 * - isCreatorVerified: User can POST 18+ content and monetize (creator document check)
 * 
 * Creator Application Flow:
 * 1. User applies (POST /api/creator/apply)
 * 2. Status goes to pending
 * 3. Admin verifies identity (POST /api/creator/verify-admin)
 * 4. isCreatorVerified set to true
 * 5. Creator status auto-approved
 */

// @route   POST /api/creator/apply
// @desc    Apply to become a creator (requires admin verification)
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

    // If already creator verified (admin has verified their documents), approve immediately
    if (user.isCreatorVerified) {
      user.creatorStatus = 'approved';
      user.isCreator = true;
      user.creatorApprovedDate = new Date();
    }

    await user.save();

    res.json({
      success: true,
      message: user.isCreatorVerified 
        ? 'Creator status approved! You can now post 18+ content and monetize.' 
        : 'Application submitted. Admin verification of your identity required to unlock creator features.',
      creatorStatus: user.creatorStatus,
      isCreator: user.isCreator,
      isAgeVerified: user.isAgeVerified,
      isCreatorVerified: user.isCreatorVerified
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
      isCreatorVerified: user.isCreatorVerified,
      applicationDate: user.creatorApplicationDate,
      approvedDate: user.creatorApprovedDate
    });
  } catch (error) {
    console.error('Creator status error:', error);
    res.status(500).json({ error: 'Failed to fetch creator status' });
  }
});

// @route   GET /api/creator/subscription-tiers
// @desc    Get the authenticated creator's subscription tiers
// @access  Private (creator only)
router.get('/subscription-tiers', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('isCreator subscriptionTiers');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (!user.isCreator) return res.status(403).json({ success: false, message: 'Creator access required' });

    res.json({ success: true, data: user.subscriptionTiers.map(serializeTier) });
  } catch (error) {
    console.error('Subscription tier fetch error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch subscription tiers' });
  }
});

// @route   PUT /api/creator/subscription-tiers
// @desc    Replace the authenticated creator's subscription tiers
// @access  Private (creator only)
router.put('/subscription-tiers', protect, async (req, res) => {
  try {
    const validationError = validateTiers(req.body.tiers);
    if (validationError) return res.status(400).json({ success: false, message: validationError });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (!user.isCreator) return res.status(403).json({ success: false, message: 'Creator access required' });

    user.subscriptionTiers = req.body.tiers.map(tier => ({
      name: tier.name.trim(),
      price: tier.price,
      description: tier.description.trim(),
      benefits: tier.benefits.map(benefit => benefit.trim()),
      color: ALLOWED_TIER_COLORS.has(tier.color) ? tier.color : 'gray',
      icon: ALLOWED_TIER_ICONS.has(tier.icon) ? tier.icon : 'star',
      isActive: tier.isActive !== false
    }));
    await user.save();

    res.json({ success: true, data: user.subscriptionTiers.map(serializeTier) });
  } catch (error) {
    console.error('Subscription tier save error:', error);
    res.status(500).json({ success: false, message: 'Failed to save subscription tiers' });
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

// @route   POST /api/creator/verify-admin
// @desc    Admin: Set isCreatorVerified for a user (document identity check)
// @access  Private (admin only)
router.post('/verify-admin', protect, async (req, res) => {
  try {
    // Check if requester is admin
    const admin = await User.findById(req.user._id);
    if (!admin.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Set creator verified
    user.isCreatorVerified = true;
    user.creatorVerifiedAt = new Date();

    // If pending, auto-approve
    if (user.creatorStatus === 'pending') {
      user.creatorStatus = 'approved';
      user.isCreator = true;
      user.creatorApprovedDate = new Date();
    }

    await user.save();

    res.json({
      success: true,
      message: `${user.username} is now creator verified`,
      user: {
        id: user._id,
        username: user.username,
        isCreatorVerified: user.isCreatorVerified,
        creatorStatus: user.creatorStatus,
        isCreator: user.isCreator
      }
    });
  } catch (error) {
    console.error('Admin verify error:', error);
    res.status(500).json({ error: 'Failed to verify creator' });
  }
});

module.exports = router;
