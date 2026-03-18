const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Post = require('../models/Post');
const { optionalAuth } = require('../middleware/auth');

// @route   GET /api/search
// @desc    Search users and posts
// @access  Public/Private
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { 
      q, 
      type = 'all', // all, users, posts
      sort = 'relevance',
      page = 1,
      limit = 20
    } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const searchQuery = q.trim();
    const results = {
      users: [],
      posts: []
    };

    // Search users
    if (type === 'all' || type === 'users') {
      const userQuery = {
        isActive: true,
        $or: [
          { username: { $regex: searchQuery, $options: 'i' } },
          { displayName: { $regex: searchQuery, $options: 'i' } },
          { bio: { $regex: searchQuery, $options: 'i' } }
        ]
      };

      const users = await User.find(userQuery)
        .select('-email -password -walletPrivateKey -subscriptions -purchasedContent')
        .sort('-followersCount')
        .limit(type === 'all' ? 5 : limit * 1)
        .skip((page - 1) * limit);

      results.users = users;
    }

    // Search posts
    if (type === 'all' || type === 'posts') {
      const postQuery = {
        status: 'published',
        $or: [
          { content: { $regex: searchQuery, $options: 'i' } },
          { tags: { $in: [new RegExp(searchQuery, 'i')] } }
        ]
      };

      // Only show public posts to non-logged in users
      if (!req.user) {
        postQuery.visibility = 'public';
      }

      // NSFW filtering
      if (!req.user || !req.user.isAgeVerified) {
        postQuery.isNSFW = false;
      }

      const posts = await Post.find(postQuery)
        .populate('author', 'username displayName avatar isVerified')
        .sort(sort === 'relevance' ? '-stats.likes -stats.views' : '-createdAt')
        .limit(type === 'all' ? 10 : limit * 1)
        .skip((page - 1) * limit);

      results.posts = posts;
    }

    res.json({
      success: true,
      query: searchQuery,
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/search/trending
// @desc    Get trending searches
// @access  Public
router.get('/trending', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    // Get trending hashtags from posts
    const trendingHashtags = await Post.aggregate([
      { $match: { status: 'published', createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: parseInt(limit) }
    ]);

    // Get trending creators
    const trendingCreators = await User.find({ isCreator: true, isActive: true })
      .select('username displayName avatar followersCount')
      .sort('-followersCount')
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: {
        hashtags: trendingHashtags.map(h => ({ tag: h._id, count: h.count })),
        creators: trendingCreators
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

// @route   GET /api/search/suggestions
// @desc    Get search suggestions (autocomplete)
// @access  Public
router.get('/suggestions', async (req, res) => {
  try {
    const { q, limit = 5 } = req.query;

    if (!q || q.trim().length === 0) {
      return res.json({
        success: true,
        data: []
      });
    }

    const searchQuery = q.trim();

    // Search users
    const users = await User.find({
      isActive: true,
      $or: [
        { username: { $regex: `^${searchQuery}`, $options: 'i' } },
        { displayName: { $regex: searchQuery, $options: 'i' } }
      ]
    })
    .select('username displayName avatar isVerified')
    .limit(parseInt(limit));

    // Search hashtags
    const hashtags = await Post.distinct('tags', {
      tags: { $regex: searchQuery, $options: 'i' }
    }).limit(parseInt(limit));

    res.json({
      success: true,
      data: {
        users,
        hashtags: hashtags.map(tag => ({ tag, type: 'hashtag' }))
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

module.exports = router;
