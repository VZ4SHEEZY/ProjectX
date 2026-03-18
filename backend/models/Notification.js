const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['follow', 'like', 'comment', 'reply', 'tip', 'subscribe', 'unlock', 'mention', 'trending', 'system'],
    required: true
  },
  
  // Related content
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
  comment: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment' },
  
  // For tips/subscriptions
  amount: { type: Number },
  currency: { type: String, default: 'ETH' },
  
  // Message content
  message: { type: String, maxlength: 500 },
  
  // Status
  isRead: { type: Boolean, default: false },
  readAt: Date,
  
  // Action taken
  actionTaken: { type: Boolean, default: false }
}, {
  timestamps: true
});

// Index for fetching unread notifications
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
