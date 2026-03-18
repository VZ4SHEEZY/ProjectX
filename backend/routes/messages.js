const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @route   GET /api/messages/conversations
// @desc    Get all conversations for current user
// @access  Private
router.get('/conversations', protect, async (req, res) => {
  try {
    // Get unique conversations
    const sentMessages = await Message.find({ sender: req.user._id })
      .distinct('recipient');
    
    const receivedMessages = await Message.find({ recipient: req.user._id })
      .distinct('sender');

    const conversationUserIds = [...new Set([...sentMessages, ...receivedMessages])];

    // Get last message and unread count for each conversation
    const conversations = await Promise.all(
      conversationUserIds.map(async (userId) => {
        const otherUser = await User.findById(userId)
          .select('username displayName avatar isVerified isCreator');

        const lastMessage = await Message.findOne({
          $or: [
            { sender: req.user._id, recipient: userId },
            { sender: userId, recipient: req.user._id }
          ]
        })
        .sort('-createdAt')
        .limit(1);

        const unreadCount = await Message.countDocuments({
          sender: userId,
          recipient: req.user._id,
          isRead: false
        });

        return {
          user: otherUser,
          lastMessage,
          unreadCount
        };
      })
    );

    // Sort by most recent message
    conversations.sort((a, b) => {
      if (!a.lastMessage) return 1;
      if (!b.lastMessage) return -1;
      return b.lastMessage.createdAt - a.lastMessage.createdAt;
    });

    res.json({
      success: true,
      count: conversations.length,
      data: conversations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/messages/:userId
// @desc    Get messages between current user and another user
// @access  Private
router.get('/:userId', protect, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;

    const messages = await Message.find({
      $or: [
        { sender: req.user._id, recipient: req.params.userId },
        { sender: req.params.userId, recipient: req.user._id }
      ]
    })
    .populate('sender', 'username displayName avatar')
    .populate('recipient', 'username displayName avatar')
    .sort('-createdAt')
    .limit(limit * 1)
    .skip((page - 1) * limit);

    // Mark messages as read
    await Message.updateMany(
      {
        sender: req.params.userId,
        recipient: req.user._id,
        isRead: false
      },
      { isRead: true }
    );

    res.json({
      success: true,
      count: messages.length,
      data: messages.reverse() // Return in chronological order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/messages/:userId
// @desc    Send a message to a user
// @access  Private
router.post('/:userId', protect, async (req, res) => {
  try {
    const { content, mediaUrl, mediaType } = req.body;

    if (!content && !mediaUrl) {
      return res.status(400).json({
        success: false,
        message: 'Message content or media is required'
      });
    }

    // Check if recipient exists
    const recipient = await User.findById(req.params.userId);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Recipient not found'
      });
    }

    // Check if recipient accepts messages
    if (recipient.privacySettings?.allowMessages === 'nobody') {
      return res.status(403).json({
        success: false,
        message: 'This user does not accept messages'
      });
    }

    if (recipient.privacySettings?.allowMessages === 'following' &&
        !recipient.following.includes(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You must be following this user to send messages'
      });
    }

    const message = await Message.create({
      sender: req.user._id,
      recipient: req.params.userId,
      content,
      mediaUrl,
      mediaType
    });

    await message.populate('sender', 'username displayName avatar');
    await message.populate('recipient', 'username displayName avatar');

    res.status(201).json({
      success: true,
      data: message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   DELETE /api/messages/:id
// @desc    Delete a message
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const message = await Message.findOne({
      _id: req.params.id,
      sender: req.user._id
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    message.isDeleted = true;
    message.content = '[deleted]';
    message.mediaUrl = null;
    await message.save();

    res.json({
      success: true,
      message: 'Message deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/messages/unread/count
// @desc    Get unread message count
// @access  Private
router.get('/unread/count', protect, async (req, res) => {
  try {
    const count = await Message.countDocuments({
      recipient: req.user._id,
      isRead: false
    });

    res.json({
      success: true,
      count
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
