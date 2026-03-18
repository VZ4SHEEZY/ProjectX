const mongoose = require('mongoose');

const viewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  viewedAt: {
    type: Date,
    default: Date.now
  }
});

const reactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reaction: {
    type: String,
    enum: ['heart', 'fire', 'laugh', 'wow', 'clap', 'party', 'hundred', 'eyes'],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const replySchema = new mongoose.Schema({
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
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const storySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  mediaUrl: {
    type: String,
    required: true
  },
  mediaType: {
    type: String,
    enum: ['image', 'video'],
    default: 'image'
  },
  caption: {
    type: String,
    maxlength: 500
  },
  filters: {
    brightness: { type: Number, default: 100 },
    contrast: { type: Number, default: 100 },
    saturation: { type: Number, default: 100 },
    blur: { type: Number, default: 0 },
    grayscale: { type: Boolean, default: false },
    sepia: { type: Boolean, default: false }
  },
  stickers: [{
    type: { type: String },
    position: {
      x: Number,
      y: Number
    },
    rotation: { type: Number, default: 0 },
    scale: { type: Number, default: 1 }
  }],
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000)
  },
  views: [viewSchema],
  reactions: [reactionSchema],
  replies: [replySchema],
  isHighlighted: {
    type: Boolean,
    default: false
  },
  music: {
    trackId: String,
    trackName: String,
    artist: String,
    startTime: { type: Number, default: 0 }
  },
  location: {
    name: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  hashtags: [String],
  link: {
    url: String,
    title: String
  }
}, {
  timestamps: true
});

storySchema.index({ user: 1, expiresAt: -1 });
storySchema.index({ expiresAt: 1 });

storySchema.virtual('viewCount').get(function() {
  return this.views.length;
});

storySchema.methods.hasViewed = function(userId) {
  return this.views.some(view => view.user.toString() === userId.toString());
};

module.exports = mongoose.model('Story', storySchema);
