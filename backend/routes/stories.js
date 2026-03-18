const express = require('express');
const router = express.Router();
const { protect: auth } = require('../middleware/auth');
const Story = require('../models/Story');
const User = require('../models/User');

// Get stories from users I follow
router.get('/feed', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const following = user.following || [];
    
    // Get active stories from followed users
    const stories = await Story.find({
      user: { $in: following },
      expiresAt: { $gt: new Date() }
    })
      .populate('user', 'username displayName avatar')
      .sort({ createdAt: -1 });
    
    // Group by user
    const groupedStories = stories.reduce((acc, story) => {
      const userId = story.user._id.toString();
      if (!acc[userId]) {
        acc[userId] = {
          user: story.user,
          stories: [],
          hasUnseen: false
        };
      }
      acc[userId].stories.push(story);
      
      // Check if user has seen all stories
      const hasSeenAll = story.views.some(
        view => view.user.toString() === req.user._id.toString()
      );
      if (!hasSeenAll) {
        acc[userId].hasUnseen = true;
      }
      
      return acc;
    }, {});
    
    res.json({
      success: true,
      stories: Object.values(groupedStories),
      count: stories.length
    });
  } catch (error) {
    console.error('Get Stories Feed Error:', error);
    res.status(500).json({ error: 'Failed to fetch stories' });
  }
});

// Get my stories
router.get('/my-stories', auth, async (req, res) => {
  try {
    const stories = await Story.find({
      user: req.user._id,
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      stories,
      count: stories.length
    });
  } catch (error) {
    console.error('Get My Stories Error:', error);
    res.status(500).json({ error: 'Failed to fetch stories' });
  }
});

// Get stories from a specific user
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const stories = await Story.find({
      user: req.params.userId,
      expiresAt: { $gt: new Date() }
    })
      .populate('user', 'username displayName avatar')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      stories,
      count: stories.length
    });
  } catch (error) {
    console.error('Get User Stories Error:', error);
    res.status(500).json({ error: 'Failed to fetch stories' });
  }
});

// Create a new story
router.post('/', auth, async (req, res) => {
  try {
    const { mediaUrl, mediaType, caption, filters, stickers } = req.body;
    
    // Check story limit (max 10 active stories per user)
    const activeStoriesCount = await Story.countDocuments({
      user: req.user._id,
      expiresAt: { $gt: new Date() }
    });
    
    if (activeStoriesCount >= 10) {
      return res.status(400).json({ 
        error: 'Maximum 10 active stories allowed. Delete some to add more.' 
      });
    }
    
    const story = new Story({
      user: req.user._id,
      mediaUrl,
      mediaType: mediaType || 'image',
      caption: caption || '',
      filters: filters || {},
      stickers: stickers || [],
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      views: [],
      reactions: [],
      replies: []
    });
    
    await story.save();
    
    // Populate and return
    const populatedStory = await Story.findById(story._id)
      .populate('user', 'username displayName avatar');
    
    res.json({
      success: true,
      story: populatedStory,
      message: 'Story created successfully'
    });
  } catch (error) {
    console.error('Create Story Error:', error);
    res.status(500).json({ error: 'Failed to create story' });
  }
});

// View a story
router.post('/:id/view', auth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }
    
    if (story.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Story has expired' });
    }
    
    // Check if already viewed
    const alreadyViewed = story.views.some(
      view => view.user.toString() === req.user._id.toString()
    );
    
    if (!alreadyViewed) {
      story.views.push({
        user: req.user._id,
        viewedAt: new Date()
      });
      await story.save();
    }
    
    res.json({
      success: true,
      viewCount: story.views.length
    });
  } catch (error) {
    console.error('View Story Error:', error);
    res.status(500).json({ error: 'Failed to record view' });
  }
});

// React to a story
router.post('/:id/react', auth, async (req, res) => {
  try {
    const { reaction } = req.body;
    const story = await Story.findById(req.params.id);
    
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }
    
    // Add reaction
    story.reactions.push({
      user: req.user._id,
      reaction,
      createdAt: new Date()
    });
    
    await story.save();
    
    res.json({
      success: true,
      message: 'Reaction added'
    });
  } catch (error) {
    console.error('React to Story Error:', error);
    res.status(500).json({ error: 'Failed to add reaction' });
  }
});

// Reply to a story
router.post('/:id/reply', auth, async (req, res) => {
  try {
    const { message } = req.body;
    const story = await Story.findById(req.params.id);
    
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }
    
    // Add reply
    story.replies.push({
      user: req.user._id,
      message,
      createdAt: new Date()
    });
    
    await story.save();
    
    // Create notification for story owner
    // (notification logic would go here)
    
    res.json({
      success: true,
      message: 'Reply sent'
    });
  } catch (error) {
    console.error('Reply to Story Error:', error);
    res.status(500).json({ error: 'Failed to send reply' });
  }
});

// Delete a story
router.delete('/:id', auth, async (req, res) => {
  try {
    const story = await Story.findOne({
      _id: req.params.id,
      user: req.user._id
    });
    
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }
    
    await Story.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'Story deleted'
    });
  } catch (error) {
    console.error('Delete Story Error:', error);
    res.status(500).json({ error: 'Failed to delete story' });
  }
});

// Get story viewers (for story owner)
router.get('/:id/viewers', auth, async (req, res) => {
  try {
    const story = await Story.findOne({
      _id: req.params.id,
      user: req.user._id
    }).populate('views.user', 'username displayName avatar');
    
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }
    
    res.json({
      success: true,
      viewers: story.views,
      count: story.views.length
    });
  } catch (error) {
    console.error('Get Story Viewers Error:', error);
    res.status(500).json({ error: 'Failed to fetch viewers' });
  }
});

// Get story statistics
router.get('/:id/stats', auth, async (req, res) => {
  try {
    const story = await Story.findOne({
      _id: req.params.id,
      user: req.user._id
    });
    
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }
    
    // Count reactions by type
    const reactionCounts = story.reactions.reduce((acc, r) => {
      acc[r.reaction] = (acc[r.reaction] || 0) + 1;
      return acc;
    }, {});
    
    res.json({
      success: true,
      stats: {
        views: story.views.length,
        reactions: reactionCounts,
        replies: story.replies.length
      }
    });
  } catch (error) {
    console.error('Get Story Stats Error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Clean up expired stories (admin endpoint)
router.delete('/cleanup/expired', auth, async (req, res) => {
  try {
    // Only allow admins or run as cron job
    const result = await Story.deleteMany({
      expiresAt: { $lt: new Date() }
    });
    
    res.json({
      success: true,
      deleted: result.deletedCount
    });
  } catch (error) {
    console.error('Cleanup Stories Error:', error);
    res.status(500).json({ error: 'Failed to cleanup stories' });
  }
});

module.exports = router;
