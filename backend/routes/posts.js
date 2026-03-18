const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect, optionalAuth, requireAgeVerified } = require('../middleware/auth');

// @route   GET /api/posts
// @desc    Get all posts (feed)
// @access  Public/Private
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      type,
      visibility,
      sort = '-createdAt',
      page = 1,
      limit = 10,
      following = false
    } = req.query;

    const query = { status: 'published' };

    // Filter by post type
    if (type) query.type = type;

    // Filter by visibility
    if (visibility) {
      query.visibility = visibility;
    } else {
      // Default: only show public posts to non-logged in users
      if (!req.user) {
        query.visibility = 'public';
      }
    }

    // Filter by following (for personalized feed)
    if (following === 'true' && req.user) {
      query.author = { $in: req.user.following };
    }

    // NSFW content filtering
    if (!req.user || !req.user.isAgeVerified) {
      query.isNSFW = false;
    }

    const posts = await Post.find(query)
      .populate('author', 'username displayName avatar isVerified')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Check access for each post
    const postsWithAccess = posts.map(post => {
      const postObj = post.toObject();
      postObj.canAccess = post.canAccess(req.user);
      return postObj;
    });

    const count = await Post.countDocuments(query);

    res.json({
      success: true,
      count: posts.length,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data: postsWithAccess
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/posts/foryou
// @desc    Get personalized "For You" feed
// @access  Private
router.get('/feed/foryou', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    // Get user's interests based on following and interactions
    const following = req.user.following;
    const userFaction = req.user.faction;

    // Build query for personalized feed
    let query = {
      status: 'published',
      visibility: { $in: ['public', 'subscribers'] }
    };

    // Include posts from followed users
    if (following.length > 0) {
      query.$or = [
        { author: { $in: following } },
        { faction: userFaction }
      ];
    } else {
      query.faction = userFaction;
    }

    // Exclude NSFW for non-verified
    if (!req.user.isAgeVerified) {
      query.isNSFW = false;
    }

    const posts = await Post.find(query)
      .populate('author', 'username displayName avatar isVerified')
      .sort('-stats.views -createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const postsWithAccess = posts.map(post => {
      const postObj = post.toObject();
      postObj.canAccess = post.canAccess(req.user);
      return postObj;
    });

    res.json({
      success: true,
      count: posts.length,
      data: postsWithAccess
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/posts/following
// @desc    Get feed from followed users only
// @access  Private
router.get('/feed/following', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    if (req.user.following.length === 0) {
      return res.json({
        success: true,
        count: 0,
        data: [],
        message: 'Follow some creators to see their posts here'
      });
    }

    const query = {
      status: 'published',
      author: { $in: req.user.following }
    };

    if (!req.user.isAgeVerified) {
      query.isNSFW = false;
    }

    const posts = await Post.find(query)
      .populate('author', 'username displayName avatar isVerified')
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const postsWithAccess = posts.map(post => {
      const postObj = post.toObject();
      postObj.canAccess = post.canAccess(req.user);
      return postObj;
    });

    res.json({
      success: true,
      count: posts.length,
      data: postsWithAccess
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/posts/trending
// @desc    Get trending posts
// @access  Public
router.get('/feed/trending', async (req, res) => {
  try {
    const { page = 1, limit = 10, timeframe = '24h' } = req.query;

    // Calculate time range
    const timeRanges = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };

    const since = new Date(Date.now() - (timeRanges[timeframe] || timeRanges['24h']));

    const posts = await Post.find({
      status: 'published',
      visibility: 'public',
      createdAt: { $gte: since },
      isNSFW: false
    })
    .populate('author', 'username displayName avatar isVerified')
    .sort('-stats.views -stats.likes')
    .limit(limit * 1)
    .skip((page - 1) * limit);

    res.json({
      success: true,
      count: posts.length,
      data: posts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/posts/:id
// @desc    Get single post
// @access  Public/Private
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'username displayName avatar isVerified')
      .populate({
        path: 'comments',
        populate: {
          path: 'author',
          select: 'username displayName avatar isVerified'
        }
      });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check if user can access
    if (!post.canAccess(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this content',
        requiresSubscription: post.visibility === 'subscribers',
        requiresPurchase: post.visibility === 'ppv',
        price: post.price
      });
    }

    // Increment view count
    post.stats.views += 1;
    await post.save();

    const postObj = post.toObject();
    postObj.canAccess = true;

    res.json({
      success: true,
      data: postObj
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/posts
// @desc    Create a new post
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const {
      content,
      type,
      mediaUrl,
      thumbnail,
      visibility,
      price,
      isNSFW,
      isSensitive,
      tags,
      location,
      duration
    } = req.body;

    // Validate required fields
    if (!content && !mediaUrl) {
      return res.status(400).json({
        success: false,
        message: 'Content or media is required'
      });
    }

    // Check age verification for NSFW
    if (isNSFW && !req.user.isAgeVerified) {
      return res.status(403).json({
        success: false,
        message: 'Age verification required for NSFW content'
      });
    }

    const post = await Post.create({
      author: req.user._id,
      content,
      type: type || 'text',
      mediaUrl,
      thumbnail,
      visibility: visibility || 'public',
      price,
      isNSFW: isNSFW || false,
      isSensitive: isSensitive || false,
      tags: tags || [],
      location,
      duration,
      status: 'published'
    });

    await post.populate('author', 'username displayName avatar isVerified');

    // Create notifications for followers
    const followers = await User.find({
      following: req.user._id,
      'notificationSettings.newPost': true
    });

    const notifications = followers.map(follower => ({
      recipient: follower._id,
      sender: req.user._id,
      type: 'new_post',
      post: post._id,
      message: `${req.user.displayName || req.user.username} posted new content`
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    res.status(201).json({
      success: true,
      data: post
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/posts/:id
// @desc    Update a post
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    let post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check ownership
    if (post.author.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this post'
      });
    }

    const updateFields = {};
    const allowedFields = ['content', 'thumbnail', 'visibility', 'price', 'isNSFW', 'isSensitive', 'tags', 'status'];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateFields[field] = req.body[field];
      }
    });

    post = await Post.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true, runValidators: true }
    ).populate('author', 'username displayName avatar isVerified');

    res.json({
      success: true,
      data: post
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   DELETE /api/posts/:id
// @desc    Delete a post
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check ownership
    if (post.author.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this post'
      });
    }

    await post.deleteOne();

    res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/posts/:id/like
// @desc    Like/unlike a post
// @access  Private
router.post('/:id/like', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const isLiked = post.likedBy.includes(req.user._id);

    if (isLiked) {
      // Unlike
      post.likedBy = post.likedBy.filter(
        id => id.toString() !== req.user._id.toString()
      );
      post.stats.likes = Math.max(0, post.stats.likes - 1);
    } else {
      // Like
      post.likedBy.push(req.user._id);
      post.stats.likes += 1;

      // Create notification
      if (post.author.toString() !== req.user._id.toString()) {
        await Notification.create({
          recipient: post.author,
          sender: req.user._id,
          type: 'like',
          post: post._id,
          message: `${req.user.displayName || req.user.username} liked your post`
        });
      }
    }

    await post.save();

    res.json({
      success: true,
      isLiked: !isLiked,
      likes: post.stats.likes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/posts/:id/view
// @desc    Record a view (for videos)
// @access  Public
router.post('/:id/view', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    post.stats.views += 1;
    await post.save();

    res.json({
      success: true,
      views: post.stats.views
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
