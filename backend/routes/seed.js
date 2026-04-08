const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Post = require('../models/Post');
const { protect } = require('../middleware/auth');

// @route   POST /api/seed/populate-test-data
// @desc    Populate test data for current logged-in user (follows + faction + posts)
// @access  Private (requires auth)
router.post('/populate-test-data', protect, async (req, res) => {
  try {
    const currentUser = req.user;

    // Get all users except current user
    const allUsers = await User.find({ _id: { $ne: currentUser._id } });

    if (allUsers.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No other users found in database. Run seed script first.' 
      });
    }

    // Pick random faction if user is unaffiliated
    const factions = ['Neon Wraith', 'Chrome Legion', 'Iron Veil', 'Void Circuit', 'Binary Ghost', 'Gold Syndicate'];
    if (!currentUser.faction || currentUser.faction === 'Unaffiliated') {
      currentUser.faction = factions[Math.floor(Math.random() * factions.length)];
    }

    // Make current user follow 3-5 random users
    const numFollows = Math.floor(Math.random() * 3) + 3; // 3-5
    const usersToFollow = allUsers.slice(0, numFollows);

    for (const userToFollow of usersToFollow) {
      if (!currentUser.following.includes(userToFollow._id)) {
        currentUser.following.push(userToFollow._id);
      }
      if (!userToFollow.followers.includes(currentUser._id)) {
        userToFollow.followers.push(currentUser._id);
      }
      userToFollow.followersCount = userToFollow.followers.length;
      await userToFollow.save();
    }

    currentUser.followingCount = currentUser.following.length;

    // Find posts from users in same faction
    const factionUsers = await User.find({ faction: currentUser.faction, _id: { $ne: currentUser._id } });
    const factionUserIds = factionUsers.map(u => u._id);

    // Get some posts from faction users
    const factionPosts = await Post.find({
      author: { $in: factionUserIds },
      status: 'published'
    }).populate('author', 'username avatar isVerified').limit(10);

    // If no faction posts, get posts from followed users
    let visiblePosts = [...factionPosts];
    if (visiblePosts.length < 5) {
      const followingPosts = await Post.find({
        author: { $in: currentUser.following },
        status: 'published'
      }).populate('author', 'username avatar isVerified').limit(10);
      visiblePosts = [...factionPosts, ...followingPosts];
    }

    await currentUser.save();

    res.json({
      success: true,
      message: 'Test data populated successfully',
      data: {
        faction: currentUser.faction,
        followingCount: currentUser.followingCount,
        followersAdded: usersToFollow.length,
        factionPostsAvailable: factionPosts.length,
        followingPostsAvailable: visiblePosts.length
      }
    });
  } catch (error) {
    console.error('Error populating test data:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

module.exports = router;
