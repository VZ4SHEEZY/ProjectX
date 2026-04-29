const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const { protect } = require('../middleware/auth');

// POST: Create announcement (admin only)
router.post('/', protect, async (req, res) => {
  try {
    // Check if user is vz4sheezy
    if (req.user.username !== 'vz4sheezy') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }

    const { message, targetType, targetFaction } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message required' });
    }

    const announcement = new Announcement({
      title: 'Announcement',
      message,
      targetType,
      targetFaction: targetType === 'faction' ? targetFaction : null,
      createdBy: req.user.id,
    });

    await announcement.save();
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

// POST: Dismiss announcement
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
