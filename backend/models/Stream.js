const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  sentAt: {
    type: Date,
    default: Date.now
  }
});

const streamSchema = new mongoose.Schema({
  streamer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  description: {
    type: String,
    maxlength: 1000
  },
  thumbnail: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    default: 'General'
  },
  isLive: {
    type: Boolean,
    default: false
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  endedAt: {
    type: Date
  },
  viewers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  viewerCount: {
    type: Number,
    default: 0
  },
  chatMessages: [chatMessageSchema],
  tips: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tip'
  }],
  totalTips: {
    type: Number,
    default: 0
  },
  recordingUrl: {
    type: String,
    default: ''
  },
  isRecorded: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for faster queries
streamSchema.index({ isLive: 1, startedAt: -1 });
streamSchema.index({ streamer: 1 });

module.exports = mongoose.model('Stream', streamSchema);
