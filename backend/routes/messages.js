const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const mongoose = require('mongoose');

// Keep static paths before /:recipientId so they are not interpreted as user IDs.
router.get('/unread/count', protect, async (req, res) => {
  try {
    const count = await Message.countDocuments({ recipient: req.user._id, read: false });
    res.json({ success: true, unreadCount: count });
  } catch (error) {
    console.error('Count unread error:', error);
    res.status(500).json({ success: false, message: 'Failed to count unread messages' });
  }
});

// Send message
// POST /api/messages
router.post('/', protect, async (req, res) => {
  try {
    const { recipientId, content, mediaUrl, isVanishing = true } = req.body;

    if (!mongoose.isValidObjectId(recipientId) || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Recipient and content are required'
      });
    }

    // Verify recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Recipient not found'
      });
    }

    const message = new Message({
      sender: req.user._id,
      recipient: recipientId,
      content: content.trim(),
      mediaUrl,
      isVanishing,
      expiresAt: isVanishing ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null
    });

    await message.save();
    await message.populate('sender', 'username avatar');

    res.json({
      success: true,
      data: message,
      message: 'Message sent'
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message'
    });
  }
});

// Get messages with a specific user
// GET /api/messages/:recipientId
router.get('/:recipientId', protect, async (req, res) => {
  try {
    const { limit = 50, skip = 0 } = req.query;

    const messages = await Message.find({
      $or: [
        { sender: req.user._id, recipient: req.params.recipientId },
        { sender: req.params.recipientId, recipient: req.user._id }
      ]
    })
    .populate('sender', 'username avatar')
    .populate('recipient', 'username avatar')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip(parseInt(skip))
    .lean();

    res.json({
      success: true,
      data: messages.reverse(), // Reverse to show oldest first
      hasMore: (skip + parseInt(limit)) < await Message.countDocuments({
        $or: [
          { sender: req.user._id, recipient: req.params.recipientId },
          { sender: req.params.recipientId, recipient: req.user._id }
        ]
      })
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages'
    });
  }
});

// Mark message as read
// PATCH /api/messages/:id/read
router.patch('/:id/read', protect, async (req, res) => {
  try {
    const message = await Message.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { read: true, readAt: new Date() },
      { new: true }
    ).populate('sender', 'username avatar');

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    res.json({
      success: true,
      data: message
    });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark message as read'
    });
  }
});

// Screenshot alert
// POST /api/messages/:id/screenshot-alert
router.post('/:id/screenshot-alert', protect, async (req, res) => {
  try {
    const message = await Message.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { screenshotAlert: true },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    res.json({
      success: true,
      data: message,
      message: 'Screenshot alert logged'
    });
  } catch (error) {
    console.error('Screenshot alert error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to log screenshot alert'
    });
  }
});

// Delete message (soft delete - user just doesn't see it)
// DELETE /api/messages/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const message = await Message.findOneAndDelete({
      _id: req.params.id,
      $or: [
        { sender: req.user._id },
        { recipient: req.user._id }
      ]
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    res.json({
      success: true,
      message: 'Message deleted'
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete message'
    });
  }
});

// Clear all messages with a user
// DELETE /api/messages/chat/:recipientId
router.delete('/chat/:recipientId', protect, async (req, res) => {
  try {
    await Message.deleteMany({
      $or: [
        { sender: req.user._id, recipient: req.params.recipientId },
        { sender: req.params.recipientId, recipient: req.user._id }
      ]
    });

    res.json({
      success: true,
      message: 'Chat cleared'
    });
  } catch (error) {
    console.error('Clear chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear chat'
    });
  }
});

module.exports = router;
