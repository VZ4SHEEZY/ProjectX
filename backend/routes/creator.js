const express = require('express');
const router = express.Router();
const { protect, optionalAuth } = require('../middleware/auth');
const User = require('../models/User');
const Tip = require('../models/Tip');
const Post = require('../models/Post');
const Creator = require('../models/Creator');
const AccountCapability = require('../models/AccountCapability');
const { ethers } = require('ethers');
const tipService = require('../services/tip');
const { requireAdmin, logAdminAction } = require('../middleware/admin');
const { withProgressionOutbox } = require('../progression/runtime/outbox');

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

// Activate SFW creator tools on the existing account. Verification is separate.
router.post('/apply', protect, async (req, res) => {
  try {
    let user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const capability = await AccountCapability.findOne({ user: user._id, capability: 'creator_mode' });
    const creator = await Creator.findOne({ user: user._id });
    if (['suspended', 'revoked'].includes(capability?.state) || ['suspended', 'revoked'].includes(creator?.state)) return res.status(403).json({ error: 'Creator Mode is restricted by moderation' });
    if (user.isCreator) return res.json({ success: true, isCreator: true, creatorStatus: user.creatorStatus });

    const approvedAt = new Date();
    user = await withProgressionOutbox(async ({ session, enqueue }) => {
      // Reload inside every transaction attempt: Mongoose clears dirty fields on
      // save, even when the driver subsequently retries an aborted transaction.
      const current = await User.findById(user._id).session(session);
      if (current.isCreator) return current;
      current.creatorStatus = 'approved';
      current.isCreator = true;
      current.creatorApplicationDate ||= approvedAt;
      current.creatorApprovedDate = approvedAt;
      await AccountCapability.findOneAndUpdate({ user: current._id, capability: 'creator_mode', state: { $nin: ['suspended', 'revoked'] } }, { state: 'enabled', activatedAt: approvedAt }, { upsert: true, session });
      await Creator.findOneAndUpdate({ user: current._id, state: { $nin: ['suspended', 'revoked'] } }, { state: 'active', applicationDate: current.creatorApplicationDate, approvedDate: approvedAt, source: 'native' }, { upsert: true, session });
      await current.save({ session });
      await enqueue({ principal: 'user', eventType: 'achievement.reached', activityClass: 'ACHIEVE', actorId: current._id, beneficiaryId: current._id,
        occurredAt: approvedAt, subject: { type: 'user', id: String(current._id) }, object: { type: 'creator_status', id: String(current._id) },
        source: { objectType: 'creator_status', objectId: current._id, transition: 'approved', version: '1' } });
      return current;
    });

    res.json({
      success: true,
      message: 'Creator Mode activated on your existing profile. Restricted content and real payments remain unavailable.',
      creatorStatus: user.creatorStatus,
      isCreator: user.isCreator,
      isAgeVerified: false,
      isCreatorVerified: false
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
      isAgeVerified: false,
      isCreatorVerified: false,
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

async function loadEarnings(userId) {
    // Get all tips for this creator
    const tips = await Tip.find({ 
      creator: userId,
      txStatus: 'confirmed'
    })
      .populate('sender', 'username avatar')
      .populate('post', 'title')
      .sort({ createdAt: -1 }).limit(100);

    const [totals] = await Tip.aggregate([
      { $match: { creator: userId, txStatus: 'confirmed' } },
      { $group: { _id: null, total: { $sum: { $toDecimal: '$creatorAmount' } }, count: { $sum: 1 } } }
    ]);
    const totalEarnings = ethers.parseUnits(totals?.total?.toString() || '0', 6);
    const totalTips = totals?.count || 0;
    const avgTip = totalTips ? ethers.formatUnits(totalEarnings / BigInt(totalTips), 6) : '0.00';

    return {
      stats: {
        totalEarnings: ethers.formatUnits(totalEarnings, 6),
        totalTips,
        avgTip,
        pendingTips: await Tip.countDocuments({
          creator: userId,
          txStatus: 'pending', txHash: { $exists: true }
        })
      },
      recentTips: tips.slice(0, 100).map(tip => ({
        id: tip._id,
        from: tip.sender?.username || 'Unavailable account',
        fromAvatar: tip.sender?.avatar || '',
        amount: tip.amount,
        creatorAmount: tip.creatorAmount,
        platformAmount: tip.platformAmount,
        onPost: tip.post?.title || 'Direct tip',
        message: tip.message,
        date: tip.createdAt,
        txHash: tip.txHash
      }))
    };
}

// @route   GET /api/creator/earnings
// @desc    Get creator earnings dashboard
// @access  Private
router.get('/earnings', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user || !user.isCreator) {
      return res.status(403).json({ error: 'Not a creator' });
    }

    res.json({ success: true, ...await loadEarnings(req.user._id) });
  } catch (error) {
    console.error('Earnings fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch earnings' });
  }
});

// Keep the existing dashboard response shape, with lifetime receipt totals.
router.get('/dashboard', protect, async (req, res) => {
  try {
    const user = req.user;
    if (!user.isCreator) return res.status(403).json({ error: 'Not a creator' });
    const summary = await loadEarnings(user._id);
    res.json({ success: true, creator: { username: user.username, avatar: user.avatar, bio: user.bio, isCreator: true, followersCount: user.followersCount },
      earnings: { total: summary.stats.totalEarnings, tips: summary.stats.totalTips, average: summary.stats.avgTip, embeddedWallet: user.embeddedWalletAddress }, recentTips: summary.recentTips.slice(0, 20) });
  } catch { res.status(500).json({ error: 'Failed to fetch dashboard' }); }
});

// @route   POST /api/creator/verify-admin
// @desc    Admin: Set isCreatorVerified for a user (document identity check)
// @access  Private (admin only)
router.post('/verify-admin', protect, requireAdmin, logAdminAction('creator_verification_override'), async (req, res) => {
  return res.status(503).json({ error: 'A legitimate identity verification provider is required. Manual overrides are disabled.' });

});


// Owner-only content and real counts, built on existing posts and account records.
router.get('/studio', protect, async (req, res) => {
  try {
    const user = req.user;
    if (tipService.executionRequested) { try { await tipService.verifyConfiguration(); } catch {} }
    const posts = user.isCreator ? await Post.find({ author: user._id }).select('title content type status visibility isNSFW moderationState createdAt stats likesCount commentsCount').sort({ createdAt: -1 }).limit(100).lean() : [];
    const counts = user.isCreator ? await Post.aggregate([{ $match: { author: user._id } }, { $group: { _id: '$status', count: { $sum: 1 } } }]) : [];
    res.json({ success: true, isCreator: user.isCreator, audience: { followers: user.followersCount || 0, following: user.followingCount || 0 }, contentCounts: counts, posts: posts.map(post => post.isNSFW || post.moderationState === 'removed' ? { ...post, content: '', title: post.isNSFW ? 'Restricted content unavailable' : 'Removed by moderation' } : post), monetization: { ...tipService.getStatus(), realPaymentsEnabled: false, membershipsAvailable: false, verificationAvailable: false, wallet: user.externalWalletAddress || user.embeddedWalletAddress || user.walletAddress || null } });
  } catch { res.status(500).json({ error: 'Unable to load Creator Studio' }); }
});

router.get('/discover', optionalAuth, async (req, res) => {
  try {
    const candidates = await User.find({ isCreator: true, isActive: true, isQaAccount: { $ne: true }, $or: [{ profilePrivacy: 'public' }, { profilePrivacy: { $exists: false }, isPrivate: { $ne: true } }] }).select('username displayName avatar bio faction isCreator profilePrivacy isPrivate isActive').sort({ createdAt: -1 }).limit(50);
    const creators = [];
    const { canViewProfile, publicUserProjection } = require('../services/accessPolicy');
    for (const user of candidates) if ((await canViewProfile(req.user, user)).allowed) creators.push(publicUserProjection(user));
    res.json({ success: true, creators });
  } catch { res.status(500).json({ error: 'Creator discovery unavailable' }); }
});
module.exports = router;
