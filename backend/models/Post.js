const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Content
  type: {
    type: String,
    enum: ['video', 'image', 'text', 'audio', 'live'],
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  description: {
    type: String,
    maxlength: 2000,
    default: ''
  },
  
  // Media
  mediaUrl: { type: String, default: '' },
  thumbnailUrl: { type: String, default: '' },
  duration: { type: Number, default: 0 }, // in seconds
  
  // Monetization
  monetizationType: {
    type: String,
    enum: ['free', 'subscribers', 'ppv', 'nft'],
    default: 'free'
  },
  price: { type: Number, default: 0 }, // for PPV
  
  // Content flags
  isNSFW: { type: Boolean, default: false },
  isSensitive: { type: Boolean, default: false },
  
  // Stats
  views: { type: Number, default: 0 },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  likesCount: { type: Number, default: 0 },
  commentsCount: { type: Number, default: 0 },
  sharesCount: { type: Number, default: 0 },
  
  // Earnings
  earnings: { type: Number, default: 0 },
  unlocks: [{ 
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    amount: Number,
    unlockedAt: { type: Date, default: Date.now }
  }],
  
  // Tags
  tags: [{ type: String, maxlength: 50 }],
  
  // For live streams
  isLive: { type: Boolean, default: false },
  streamStartedAt: Date,
  streamEndedAt: Date,
  
  // Scheduling
  scheduledFor: Date,
  isPublished: { type: Boolean, default: true },
  
  // Moderation
  isReported: { type: Boolean, default: false },
  reports: [{ 
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: String,
    reportedAt: { type: Date, default: Date.now }
  }],
  
  // Pinned
  isPinned: { type: Boolean, default: false }
}, {
  timestamps: true
});

// Indexes for performance
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ tags: 1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ likesCount: -1 });
postSchema.index({ views: -1 });

// Virtual for engagement rate
postSchema.virtual('engagementRate').get(function() {
  if (this.views === 0) return 0;
  return ((this.likesCount + this.commentsCount) / this.views * 100).toFixed(2);
});

// Method to check if user has access
postSchema.methods.canAccess = function(userId, userSubscriptions = []) {
  // Author always has access
  if (this.author.toString() === userId) return true;
  
  // Free content
  if (this.monetizationType === 'free') return true;
  
  // Check if user unlocked PPV
  if (this.monetizationType === 'ppv') {
    return this.unlocks.some(u => u.user.toString() === userId);
  }
  
  // Check subscription
  if (this.monetizationType === 'subscribers') {
    return userSubscriptions.includes(this.author.toString());
  }
  
  return false;
};

module.exports = mongoose.model('Post', postSchema);
