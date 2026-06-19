const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  // Sender and recipient
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Message content
  content: {
    type: String,
    maxlength: 5000
  },

  mediaUrl: {
    type: String
  },

  // Vanishing messages
  isVanishing: {
    type: Boolean,
    default: true
  },

  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    index: true,
    expires: 0 // TTL index - auto-delete when date is reached
  },

  // Read status
  read: {
    type: Boolean,
    default: false,
    index: true
  },

  readAt: {
    type: Date
  },

  // Screenshot alert
  screenshotAlert: {
    type: Boolean,
    default: false
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for efficient message queries
messageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });
messageSchema.index({ recipient: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
