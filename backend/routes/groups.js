const express = require('express');
const router = express.Router();
const { protect: auth } = require('../middleware/auth');
const Group = require('../models/Group');
const User = require('../models/User');

// Get all groups
router.get('/', async (req, res) => {
  try {
    const { category, search, sort = 'members' } = req.query;
    
    let query = {};
    
    if (category) {
      query.category = category;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    let sortOption = {};
    switch (sort) {
      case 'members':
        sortOption = { memberCount: -1 };
        break;
      case 'newest':
        sortOption = { createdAt: -1 };
        break;
      case 'active':
        sortOption = { lastActivity: -1 };
        break;
      default:
        sortOption = { memberCount: -1 };
    }
    
    const groups = await Group.find(query)
      .populate('creator', 'username displayName avatar')
      .populate('admins', 'username displayName avatar')
      .sort(sortOption)
      .limit(50);
    
    res.json({
      success: true,
      groups,
      count: groups.length
    });
  } catch (error) {
    console.error('Get Groups Error:', error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// Get my groups
router.get('/my-groups', auth, async (req, res) => {
  try {
    const groups = await Group.find({
      'members.user': req.user._id
    })
      .populate('creator', 'username displayName avatar')
      .sort({ lastActivity: -1 });
    
    res.json({
      success: true,
      groups,
      count: groups.length
    });
  } catch (error) {
    console.error('Get My Groups Error:', error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// Get group by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('creator', 'username displayName avatar')
      .populate('admins', 'username displayName avatar')
      .populate('members.user', 'username displayName avatar');
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    // Check if user is a member
    const isMember = group.members.some(
      m => m.user._id.toString() === req.user._id.toString()
    );
    
    const isAdmin = group.admins.some(
      a => a._id.toString() === req.user._id.toString()
    );
    
    const isCreator = group.creator._id.toString() === req.user._id.toString();
    
    res.json({
      success: true,
      group: {
        ...group.toObject(),
        isMember,
        isAdmin,
        isCreator
      }
    });
  } catch (error) {
    console.error('Get Group Error:', error);
    res.status(500).json({ error: 'Failed to fetch group' });
  }
});

// Create new group
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, category, avatar, coverImage, isPrivate, tags } = req.body;
    
    // Check if group name exists
    const existingGroup = await Group.findOne({ name: name.toLowerCase() });
    if (existingGroup) {
      return res.status(400).json({ error: 'Group name already taken' });
    }
    
    const group = new Group({
      name,
      description,
      category: category || 'General',
      avatar,
      coverImage,
      isPrivate: isPrivate || false,
      tags: tags || [],
      creator: req.user._id,
      admins: [req.user._id],
      members: [{ user: req.user._id, role: 'admin', joinedAt: new Date() }],
      memberCount: 1,
      rules: [],
      settings: {
        allowPosts: true,
        requireApproval: false,
        allowInvites: true
      }
    });
    
    await group.save();
    
    const populatedGroup = await Group.findById(group._id)
      .populate('creator', 'username displayName avatar');
    
    res.json({
      success: true,
      group: populatedGroup,
      message: 'Group created successfully'
    });
  } catch (error) {
    console.error('Create Group Error:', error);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

// Join group
router.post('/:id/join', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    // Check if already member
    const isMember = group.members.some(
      m => m.user.toString() === req.user._id.toString()
    );
    
    if (isMember) {
      return res.status(400).json({ error: 'Already a member' });
    }
    
    if (group.isPrivate) {
      // Add to pending requests
      group.pendingRequests = group.pendingRequests || [];
      
      const alreadyRequested = group.pendingRequests.some(
        r => r.user.toString() === req.user._id.toString()
      );
      
      if (alreadyRequested) {
        return res.status(400).json({ error: 'Request already pending' });
      }
      
      group.pendingRequests.push({
        user: req.user._id,
        requestedAt: new Date()
      });
      
      await group.save();
      
      return res.json({
        success: true,
        message: 'Join request sent'
      });
    }
    
    // Add as member
    group.members.push({
      user: req.user._id,
      role: 'member',
      joinedAt: new Date()
    });
    
    group.memberCount = group.members.length;
    await group.save();
    
    res.json({
      success: true,
      message: 'Joined group successfully'
    });
  } catch (error) {
    console.error('Join Group Error:', error);
    res.status(500).json({ error: 'Failed to join group' });
  }
});

// Leave group
router.post('/:id/leave', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    // Can't leave if you're the creator
    if (group.creator.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: 'Creator cannot leave group. Transfer ownership first.' });
    }
    
    // Remove from members
    group.members = group.members.filter(
      m => m.user.toString() !== req.user._id.toString()
    );
    
    // Remove from admins
    group.admins = group.admins.filter(
      a => a.toString() !== req.user._id.toString()
    );
    
    group.memberCount = group.members.length;
    await group.save();
    
    res.json({
      success: true,
      message: 'Left group successfully'
    });
  } catch (error) {
    console.error('Leave Group Error:', error);
    res.status(500).json({ error: 'Failed to leave group' });
  }
});

// Approve join request
router.post('/:id/approve', auth, async (req, res) => {
  try {
    const { userId } = req.body;
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    // Check if requester is admin
    const isAdmin = group.admins.some(
      a => a.toString() === req.user._id.toString()
    );
    
    if (!isAdmin) {
      return res.status(403).json({ error: 'Only admins can approve requests' });
    }
    
    // Remove from pending
    group.pendingRequests = group.pendingRequests.filter(
      r => r.user.toString() !== userId
    );
    
    // Add to members
    group.members.push({
      user: userId,
      role: 'member',
      joinedAt: new Date()
    });
    
    group.memberCount = group.members.length;
    await group.save();
    
    res.json({
      success: true,
      message: 'Request approved'
    });
  } catch (error) {
    console.error('Approve Request Error:', error);
    res.status(500).json({ error: 'Failed to approve request' });
  }
});

// Update group
router.put('/:id', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    // Check if requester is admin
    const isAdmin = group.admins.some(
      a => a.toString() === req.user._id.toString()
    );
    
    if (!isAdmin) {
      return res.status(403).json({ error: 'Only admins can update group' });
    }
    
    const updates = req.body;
    delete updates.creator; // Can't change creator
    delete updates.members; // Use separate endpoints for member management
    
    Object.assign(group, updates);
    await group.save();
    
    res.json({
      success: true,
      group,
      message: 'Group updated successfully'
    });
  } catch (error) {
    console.error('Update Group Error:', error);
    res.status(500).json({ error: 'Failed to update group' });
  }
});

// Delete group
router.delete('/:id', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    // Only creator can delete
    if (group.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only creator can delete group' });
    }
    
    await Group.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'Group deleted successfully'
    });
  } catch (error) {
    console.error('Delete Group Error:', error);
    res.status(500).json({ error: 'Failed to delete group' });
  }
});

// Get group categories
router.get('/categories/list', async (req, res) => {
  try {
    const categories = [
      'General',
      'Gaming',
      'Music',
      'Art',
      'Technology',
      'Crypto',
      'Fashion',
      'Fitness',
      'Food',
      'Travel',
      'Education',
      'Entertainment',
      'Business',
      'Science',
      'Politics'
    ];
    
    res.json({
      success: true,
      categories
    });
  } catch (error) {
    console.error('Get Categories Error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

module.exports = router;
