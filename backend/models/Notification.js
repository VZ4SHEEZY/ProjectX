const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // Recipient
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Actor (who triggered the notification)
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Type of notification
  type: {
    type: String,
    enum: [
      'follow',           // Someone followed you
      'like',             // Someone liked your post
      'comment',          // Someone commented on your post
      'reply',            // Someone replied to your comment
      'mention',          // Someone mentioned you in a post/comment
      'faction_win',      // Your faction won a battle
      'faction_update',   // Faction announcement
      'rank_up',          // You ranked up
      'top_post',         // Your post is trending
      'new_subscriber',   // Someone subscribed to you
      'tip',              // Someone tipped you
      'message'           // Direct message from someone
    ],
    required: true,
    index: true
  },

  // Related content
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  },

  comment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  },

  // Message content (for certain notification types)
  message: {
    type: String,
    maxlength: 500
  },

  // Metadata
  metadata: {
    // For faction battles
    factionName: String,
    battleId: String,
    
    // For rank ups
    oldRank: String,
    newRank: String,
    
    // For tips/subscriptions
    amount: Number,
    currency: String,
    
    // Generic data
    extra: mongoose.Schema.Types.Mixed
  },

  // Status
  read: {
    type: Boolean,
    default: false,
    index: true
  },

  readAt: Date,

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  // Expiration (auto-delete old notifications after 30 days)
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    index: true,
    expires: 86400 // TTL: auto-delete 1 day after expiresAt
  }
});

// Compound index for efficient queries
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

// Prevent duplicate follow notifications (only keep most recent)
notificationSchema.pre('save', async function(next) {
  if (this.type === 'follow') {
    const existing = await mongoose.model('Notification').findOne({
      recipient: this.recipient,
      actor: this.actor,
      type: 'follow',
      _id: { $ne: this._id }
    });
    
    if (existing) {
      await mongoose.model('Notification').deleteOne({ _id: existing._id });
    }
  }
  next();
});

module.exports = mongoose.model('Notification', notificationSchema);
