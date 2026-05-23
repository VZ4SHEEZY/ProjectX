const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// Get all notifications for current user
// GET /api/notifications
router.get('/', protect, async (req, res) => {
  try {
    const { limit = 50, skip = 0, unreadOnly = false } = req.query;

    const query = { recipient: req.user._id };
    if (unreadOnly === 'true') {
      query.read = false;
    }

    const [notifications, unreadCount, totalCount] = await Promise.all([
      Notification.find(query)
        .populate('actor', 'username avatar isVerified')
        .populate('post', 'mediaUrl title')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(skip))
        .lean(),
      Notification.countDocuments({ recipient: req.user._id, read: false }),
      Notification.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: notifications,
      unreadCount,
      totalCount,
      hasMore: skip + parseInt(limit) < totalCount
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  }
});

// Get unread count
// GET /api/notifications/count/unread
router.get('/count/unread', protect, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.user._id,
      read: false
    });

    res.json({ success: true, unreadCount: count });
  } catch (error) {
    console.error('Count unread error:', error);
    res.status(500).json({ success: false, error: 'Failed to count notifications' });
  }
});

// Mark notification as read
// PATCH /api/notifications/:id/read
router.patch('/:id/read', protect, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { read: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    res.json({ success: true, data: notification });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
// PATCH /api/notifications/read/all
router.patch('/read/all', protect, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { read: true, readAt: new Date() }
    );

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark all as read' });
  }
});

// Delete notification
// DELETE /api/notifications/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user._id
    });

    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete notification' });
  }
});

// Clear all notifications
// DELETE /api/notifications
router.delete('/', protect, async (req, res) => {
  try {
    await Notification.deleteMany({ recipient: req.user._id });
    res.json({ success: true, message: 'All notifications cleared' });
  } catch (error) {
    console.error('Clear all error:', error);
    res.status(500).json({ success: false, error: 'Failed to clear notifications' });
  }
});

// ============================================================
// INTERNAL HELPERS (called by other routes, not by frontend)
// ============================================================

// Create notification (called when posting, following, etc)
async function createNotification(recipientId, actorId, type, options = {}) {
  try {
    // Don't notify users of their own actions
    if (recipientId.toString() === actorId.toString()) {
      return null;
    }

    const notification = new Notification({
      recipient: recipientId,
      actor: actorId,
      type,
      post: options.post,
      comment: options.comment,
      message: options.message,
      metadata: options.metadata || {}
    });

    await notification.save();
    return notification.populate(['actor', 'post']);
  } catch (error) {
    console.error('Create notification error:', error);
    return null;
  }
}

// Export for use in other routes
module.exports = router;
module.exports.createNotification = createNotification;
