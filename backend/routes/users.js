const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Post = require('../models/Post');
const { protect } = require('../middleware/auth');

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
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { displayName: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by faction
    if (faction) query.faction = faction;
    
    // Filter creators
    if (isCreator === 'true') query.isCreator = true;
    
    // Filter verified
    if (isVerified === 'true') query.isVerified = true;

    const users = await User.find(query)
      .select('-email -password -walletPrivateKey -subscriptions -purchasedContent')
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
      data: users
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
    .select('-email -password -walletPrivateKey')
    .sort('-followersCount')
    .limit(parseInt(limit));

    res.json({
      success: true,
      count: suggestedUsers.length,
      data: suggestedUsers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/users/:username
// @desc    Get user by username
// @access  Public
router.get('/:username', async (req, res) => {
  try {
    const user = await User.findOne({ 
      username: req.params.username,
      isActive: true 
    }).select('-email -password -walletPrivateKey');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's posts
    const posts = await Post.find({ 
      author: user._id,
      status: 'published'
    })
    .sort('-createdAt')
    .limit(12)
    .populate('author', 'username displayName avatar isVerified');

    res.json({
      success: true,
      data: {
        user,
        posts
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

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
  try {
    const {
      displayName,
      bio,
      avatar,
      banner,
      faction,
      location,
      website,
      socialLinks,
      theme,
      isCreator,
      creatorSettings
    } = req.body;

    const updateFields = {};
    
    if (displayName) updateFields.displayName = displayName;
    if (bio !== undefined) updateFields.bio = bio;
    if (avatar) updateFields.avatar = avatar;
    if (banner) updateFields.banner = banner;
    if (faction) updateFields.faction = faction;
    if (location) updateFields.location = location;
    if (website) updateFields.website = website;
    if (socialLinks) updateFields.socialLinks = socialLinks;
    if (theme) updateFields.theme = theme;
    if (isCreator !== undefined) updateFields.isCreator = isCreator;
    if (creatorSettings) updateFields.creatorSettings = creatorSettings;

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

    const currentUser = await User.findById(req.user._id);
    const isFollowing = currentUser.following.includes(req.params.id);

    if (isFollowing) {
      // Unfollow
      currentUser.following = currentUser.following.filter(
        id => id.toString() !== req.params.id
      );
      userToFollow.followers = userToFollow.followers.filter(
        id => id.toString() !== req.user._id.toString()
      );
    } else {
      // Follow
      currentUser.following.push(req.params.id);
      userToFollow.followers.push(req.user._id);
    }

    await currentUser.save();
    await userToFollow.save();

    res.json({
      success: true,
      isFollowing: !isFollowing,
      message: isFollowing ? 'Unfollowed successfully' : 'Followed successfully'
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
router.get('/:id/followers', async (req, res) => {
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

    res.json({
      success: true,
      count: user.followers.length,
      data: user.followers
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
router.get('/:id/following', async (req, res) => {
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

    res.json({
      success: true,
      count: user.following.length,
      data: user.following
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
router.get('/:id/stats', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

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
        earnings: user.earnings
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
