const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const Post = require('../models/Post');
const { protect } = require('../middleware/auth');
const { requireAdmin, logAdminAction } = require('../middleware/admin');

// POST: Create announcement (admin only)
router.post('/', protect, requireAdmin, logAdminAction('broadcast_announcement'), async (req, res) => {
  try {

    const { message, targetType, targetFaction } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message required' });
    }
    if (!['all', 'faction'].includes(targetType)) {
      return res.status(400).json({ success: false, message: 'Invalid announcement target' });
    }
    if (targetType === 'faction' && !targetFaction) {
      return res.status(400).json({ success: false, message: 'Target faction required' });
    }

    const announcement = new Announcement({
      title: 'Announcement',
      message: message.trim(),
      targetType,
      targetFaction: targetType === 'faction' ? targetFaction : null,
      createdBy: req.user.id,
    });

    await announcement.save();
    await req.logAdminAction({ targetType: 'announcement', targetId: announcement._id, targetTypeScope: targetType, targetFaction: targetFaction || null });

    // If faction announcement, create a post in that faction
    if (targetType === 'faction' && targetFaction) {
      const post = new Post({
        author: req.user.id,
        type: 'text',
        content: message.trim(),
        description: message.trim(),
        visibility: 'faction',
        faction: targetFaction,
      });
      await post.save();
    }

    res.json({ success: true, data: announcement });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET: Latest announcement for current user
router.get('/latest', protect, async (req, res) => {
  try {
    const announcement = await Announcement.findOne({
      isActive: true,
      $or: [
        { targetType: 'all', dismissedBy: { $ne: req.user.id } },
        { targetType: 'faction', targetFaction: req.user.faction, dismissedBy: { $ne: req.user.id } },
      ],
    })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'username avatar');

    res.json({ success: true, data: announcement });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST: Dismiss announcement (for ALL users announcements)
router.post('/:id/dismiss', protect, async (req, res) => {
  try {
    await Announcement.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { dismissedBy: req.user.id } },
      { new: true }
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
