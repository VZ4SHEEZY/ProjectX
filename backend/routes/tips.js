const express = require('express');
const router = express.Router();
const Tip = require('../models/Tip');
const User = require('../models/User');
const Post = require('../models/Post');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

// @route   POST /api/tips
// @desc    Send a tip to a creator
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { recipientId, amount, message, postId, paymentMethod } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid tip amount is required'
      });
    }

    // Check recipient exists and is a creator
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Recipient not found'
      });
    }

    if (!recipient.isCreator) {
      return res.status(400).json({
        success: false,
        message: 'Can only tip creators'
      });
    }

    // Create tip record
    const tip = await Tip.create({
      sender: req.user._id,
      recipient: recipientId,
      amount,
      currency: 'USD',
      message,
      post: postId,
      paymentMethod: paymentMethod || 'wallet',
      status: 'completed' // In real app, would be 'pending' until confirmed
    });

    // Update recipient's earnings
    recipient.earnings.total += amount;
    recipient.earnings.tips += amount;
    await recipient.save();

    // Create notification
    await Notification.create({
      recipient: recipientId,
      sender: req.user._id,
      type: 'tip',
      post: postId,
      tip: tip._id,
      message: `${req.user.displayName || req.user.username} sent you a $${amount} tip!`
    });

    await tip.populate('sender', 'username displayName avatar');
    await tip.populate('recipient', 'username displayName avatar');

    res.status(201).json({
      success: true,
      data: tip
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/subscriptions
// @desc    Subscribe to a creator
// @access  Private
router.post('/subscriptions', protect, async (req, res) => {
  try {
    const { creatorId, tierId, paymentMethod } = req.body;

    // Check creator exists
    const creator = await User.findById(creatorId);
    if (!creator || !creator.isCreator) {
      return res.status(404).json({
        success: false,
        message: 'Creator not found'
      });
    }

    // Find subscription tier
    const tier = creator.creatorSettings.subscriptionTiers.id(tierId);
    if (!tier) {
      return res.status(404).json({
        success: false,
        message: 'Subscription tier not found'
      });
    }

    // Check if already subscribed
    const existingSub = req.user.subscriptions.find(
      sub => sub.creator.toString() === creatorId && sub.status === 'active'
    );

    if (existingSub) {
      return res.status(400).json({
        success: false,
        message: 'Already subscribed to this creator'
      });
    }

    // Calculate expiration (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Add subscription to user
    req.user.subscriptions.push({
      creator: creatorId,
      tier: tierId,
      price: tier.price,
      expiresAt,
      status: 'active'
    });

    await req.user.save();

    // Update creator's subscriber stats
    creator.earnings.subscriptions += tier.price;
    creator.earnings.total += tier.price;
    await creator.save();

    // Create subscription record
    const tip = await Tip.create({
      sender: req.user._id,
      recipient: creatorId,
      amount: tier.price,
      currency: 'USD',
      type: 'subscription',
      paymentMethod: paymentMethod || 'wallet',
      status: 'completed'
    });

    // Create notification
    await Notification.create({
      recipient: creatorId,
      sender: req.user._id,
      type: 'subscription',
      tip: tip._id,
      message: `${req.user.displayName || req.user.username} subscribed to your ${tier.name} tier!`
    });

    res.json({
      success: true,
      message: `Successfully subscribed to ${creator.displayName || creator.username}`,
      data: {
        tier: tier.name,
        price: tier.price,
        expiresAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/purchases
// @desc    Purchase PPV content
// @access  Private
router.post('/purchases', protect, async (req, res) => {
  try {
    const { postId, paymentMethod } = req.body;

    // Check post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    if (post.visibility !== 'ppv') {
      return res.status(400).json({
        success: false,
        message: 'This post is not pay-per-view'
      });
    }

    // Check if already purchased
    const alreadyPurchased = req.user.purchasedContent.includes(postId);
    if (alreadyPurchased) {
      return res.status(400).json({
        success: false,
        message: 'Content already purchased'
      });
    }

    // Add to purchased content
    req.user.purchasedContent.push(postId);
    await req.user.save();

    // Update creator's earnings
    const creator = await User.findById(post.author);
    if (creator) {
      creator.earnings.ppv += post.price;
      creator.earnings.total += post.price;
      await creator.save();
    }

    // Create purchase record
    const tip = await Tip.create({
      sender: req.user._id,
      recipient: post.author,
      amount: post.price,
      currency: 'USD',
      type: 'ppv',
      post: postId,
      paymentMethod: paymentMethod || 'wallet',
      status: 'completed'
    });

    // Create notification
    await Notification.create({
      recipient: post.author,
      sender: req.user._id,
      type: 'purchase',
      post: postId,
      tip: tip._id,
      message: `${req.user.displayName || req.user.username} purchased your content!`
    });

    res.json({
      success: true,
      message: 'Content purchased successfully',
      data: {
        postId,
        price: post.price
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/tips/sent
// @desc    Get tips sent by current user
// @access  Private
router.get('/sent', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const tips = await Tip.find({ sender: req.user._id })
      .populate('recipient', 'username displayName avatar')
      .populate('post', 'content mediaUrl')
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    res.json({
      success: true,
      count: tips.length,
      data: tips
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/tips/received
// @desc    Get tips received by current user
// @access  Private
router.get('/received', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const tips = await Tip.find({ recipient: req.user._id })
      .populate('sender', 'username displayName avatar')
      .populate('post', 'content mediaUrl')
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    res.json({
      success: true,
      count: tips.length,
      data: tips
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/subscriptions
// @desc    Get current user's subscriptions
// @access  Private
router.get('/subscriptions', protect, async (req, res) => {
  try {
    const subscriptions = await Promise.all(
      req.user.subscriptions
        .filter(sub => sub.status === 'active')
        .map(async (sub) => {
          const creator = await User.findById(sub.creator)
            .select('username displayName avatar isVerified');
          return {
            ...sub.toObject(),
            creator
          };
        })
    );

    res.json({
      success: true,
      count: subscriptions.length,
      data: subscriptions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
