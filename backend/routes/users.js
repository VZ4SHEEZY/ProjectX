const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Post = require('../models/Post');
const { protect, optionalAuth } = require('../middleware/auth');
const { createNotification } = require('./notifications');
const Follow = require('../models/Follow');
const { canViewProfile, canViewPost, publicUserProjection } = require('../services/accessPolicy');
const { isBlockedEitherWay, isFollowing } = require('../services/relationshipPolicy');
const { validateProfileUpdate } = require('../services/profileValidation');
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const PUBLIC_USER_FIELDS = [
  'username', 'displayName', 'avatar', 'banner', 'bio', 'faction', 'factionColor',
  'isVerified', 'isCreator', 'creatorStatus', 'followersCount',
  'followingCount', 'postsCount', 'theme', 'location', 'website', 'socialLinks',
  'subscriptionTiers', 'profilePrivacy', 'isOnline', 'lastActive', 'createdAt'
].join(' ');

// @route   GET /api/users
// @desc    Get all users (with filters)
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { 
      search, 
      faction, 
      isCreator, 
      isVerified, 
      sort = '-createdAt',
      page = 1,
      limit = 20
    } = req.query;

    const query = { isActive: true };

    // Search by username or display name
    if (search) {
      const safeSearch = escapeRegex(String(search).slice(0, 100));
      query.$or = [
        { username: { $regex: safeSearch, $options: 'i' } },
        { displayName: { $regex: safeSearch, $options: 'i' } }
      ];
    }

    // Filter by faction
    if (faction) query.faction = faction;
    
    // Filter creators
    if (isCreator === 'true') query.isCreator = true;
    
    // Filter verified
    if (isVerified === 'true') query.isVerified = true;

    const users = await User.find(query)
      .select(PUBLIC_USER_FIELDS)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await User.countDocuments(query);

    res.json({
      success: true,
      count: users.length,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      data: users.map(user => publicUserProjection(user))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/users/suggested
// @desc    Get suggested users to follow
// @access  Private
router.get('/suggested', protect, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    // Get users not followed by current user
    const following = req.user.following.map(id => id.toString());
    
    const suggestedUsers = await User.find({
      _id: { 
        $nin: [...following, req.user._id] 
      },
      isActive: true,
      isCreator: true
    })
    .select(PUBLIC_USER_FIELDS)
    .sort('-followersCount')
    .limit(parseInt(limit));

    res.json({
      success: true,
      count: suggestedUsers.length,
      data: suggestedUsers.map(user => publicUserProjection(user))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/users/:identifier
// @desc    Get user by username or MongoDB ID
// @access  Public
router.get('/:identifier', optionalAuth, async (req, res) => {
  try {
    const identifier = req.params.identifier;
    const identityQuery = require('mongoose').isValidObjectId(identifier)
      ? { _id: identifier }
      : { username: identifier.toLowerCase() };
    const user = await User.findOne({
      ...identityQuery,
      isActive: true 
    }).select(PUBLIC_USER_FIELDS);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const profileAccess = await canViewProfile(req.user, user);
    if (!profileAccess.allowed) {
      return res.status(profileAccess.reason === 'blocked' ? 404 : 403).json({
        success: false,
        code: profileAccess.reason === 'blocked' ? 'PROFILE_NOT_FOUND' : 'PRIVATE_PROFILE',
        message: profileAccess.reason === 'blocked' ? 'User not found' : 'This profile is private'
      });
    }

    const candidates = await Post.find({
      author: user._id,
      status: 'published'
    })
    .sort('-createdAt')
    .limit(12)
    .populate('author', 'username displayName avatar isVerified');

    const posts = [];
    for (const post of candidates) if ((await canViewPost(req.user, post, user)).allowed) posts.push(post);
    const data = publicUserProjection(user, { includePresence: true });
    data.isFollowing = req.user ? await isFollowing(req.user._id, user._id) : false;

    res.json({
      success: true,
      data,
      posts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
  try {
    const validation = validateProfileUpdate(req.body);
    if (validation.error) return res.status(400).json({ success: false, message: validation.error });
    const updateFields = {};
    for (const [key, value] of Object.entries(validation.update)) {
      if (['theme', 'socialLinks', 'profileLayout'].includes(key)) {
        for (const [nestedKey, nestedValue] of Object.entries(value)) updateFields[`${key}.${nestedKey}`] = nestedValue;
      } else updateFields[key] = value;
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateFields,
      { new: true, runValidators: true }
    ).select('-password -walletPrivateKey');

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/users/:id/follow
// @desc    Follow/unfollow a user
// @access  Private
// POST /api/users/:id/follow - Follow/unfollow user
router.post('/:id/follow', protect, async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot follow yourself'
      });
    }

    const userToFollow = await User.findById(req.params.id);
    
    if (!userToFollow) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (await isBlockedEitherWay(req.user._id, userToFollow._id)) return res.status(403).json({ success: false, message: 'Relationship unavailable' });
    const currentUser = await User.findById(req.user._id);
    const followingNow = await isFollowing(currentUser._id, userToFollow._id);

    if (followingNow) {
      // Unfollow
      currentUser.following = currentUser.following.filter(
        id => id.toString() !== req.params.id
      );
      userToFollow.followers = userToFollow.followers.filter(
        id => id.toString() !== req.user._id.toString()
      );
      await Follow.deleteOne({ follower: currentUser._id, followed: userToFollow._id });
    } else {
      // Follow
      currentUser.following.push(req.params.id);
      if (!userToFollow.followers.some(id => id.toString() === req.user._id.toString())) userToFollow.followers.push(req.user._id);
      await Follow.updateOne({ follower: currentUser._id, followed: userToFollow._id }, { $setOnInsert: { source: 'native' } }, { upsert: true });
    }

    currentUser.followingCount = currentUser.following.length;
    userToFollow.followersCount = userToFollow.followers.length;
    await currentUser.save();
    await userToFollow.save();

    // Create follow notification (only if following, not unfollowing)
    if (!followingNow) {
      await createNotification(
        userToFollow._id,
        req.user._id,
        'follow',
        { message: `${currentUser.username} followed you` }
      );
    }

    res.json({
      success: true,
      isFollowing: !followingNow,
      followersCount: userToFollow.followersCount,
      followingCount: currentUser.followingCount,
      message: followingNow ? 'Unfollowed successfully' : 'Followed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/users/:id/followers
// @desc    Get user's followers
// @access  Public
router.get('/:id/followers', optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const user = await User.findById(req.params.id)
      .populate({
        path: 'followers',
        select: 'username displayName avatar isVerified isCreator',
        options: {
          limit: limit * 1,
          skip: (page - 1) * limit
        }
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    if (!(await canViewProfile(req.user, user)).allowed) return res.status(403).json({ success: false, message: 'Profile access denied' });

    res.json({
      success: true,
      count: user.followers.length,
      data: user.followers.map(item => publicUserProjection(item))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/users/:id/following
// @desc    Get users that a user is following
// @access  Public
router.get('/:id/following', optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const user = await User.findById(req.params.id)
      .populate({
        path: 'following',
        select: 'username displayName avatar isVerified isCreator',
        options: {
          limit: limit * 1,
          skip: (page - 1) * limit
        }
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    if (!(await canViewProfile(req.user, user)).allowed) return res.status(403).json({ success: false, message: 'Profile access denied' });

    res.json({
      success: true,
      count: user.following.length,
      data: user.following.map(item => publicUserProjection(item))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/users/:id/stats
// @desc    Get user statistics
// @access  Public
router.get('/:id/stats', optionalAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    if (!(await canViewProfile(req.user, user)).allowed) return res.status(403).json({ success: false, message: 'Profile access denied' });

    // Get post stats
    const postStats = await Post.aggregate([
      { $match: { author: user._id } },
      {
        $group: {
          _id: null,
          totalPosts: { $sum: 1 },
          totalViews: { $sum: '$stats.views' },
          totalLikes: { $sum: '$stats.likes' },
          totalComments: { $sum: '$stats.comments' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        followers: user.followers.length,
        following: user.following.length,
        posts: postStats[0]?.totalPosts || 0,
        views: postStats[0]?.totalViews || 0,
        likes: postStats[0]?.totalLikes || 0,
        comments: postStats[0]?.totalComments || 0,
        trustClass: 'untrusted_engagement',
        progressionEligible: false
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
