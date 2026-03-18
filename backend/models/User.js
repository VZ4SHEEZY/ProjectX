const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const subscriptionTierSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  description: String,
  benefits: [String],
  isActive: { type: Boolean, default: true }
});

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false
  },
  avatar: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    maxlength: 500,
    default: ''
  },
  faction: {
    type: String,
    enum: ['Netrunners', 'Corporates', 'Street Samurai', 'Tech-Priests', 'Unaffiliated'],
    default: 'Unaffiliated'
  },
  
  // Verification
  isVerified: { type: Boolean, default: false },
  isAgeVerified: { type: Boolean, default: false },
  ageVerifiedAt: Date,
  
  // Wallet
  walletAddress: { type: String, default: '' },
  btcAddress: { type: String, default: '' },
  
  // Creator settings
  isCreator: { type: Boolean, default: false },
  subscriptionTiers: [subscriptionTierSchema],
  
  // Stats
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  followersCount: { type: Number, default: 0 },
  followingCount: { type: Number, default: 0 },
  
  // Content stats
  postsCount: { type: Number, default: 0 },
  totalViews: { type: Number, default: 0 },
  totalLikes: { type: Number, default: 0 },
  
  // Earnings
  totalEarnings: { type: Number, default: 0 },
  availableBalance: { type: Number, default: 0 },
  pendingBalance: { type: Number, default: 0 },
  
  // Theme preferences
  theme: {
    primaryColor: { type: String, default: '#39FF14' },
    secondaryColor: { type: String, default: '#FF00FF' },
    accentColor: { type: String, default: '#00FFFF' },
    backgroundColor: { type: String, default: '#050505' },
    fontFamily: { type: String, default: 'mono' },
    fontSize: { type: String, default: 'medium' },
    animations: { type: Boolean, default: true },
    glowEffects: { type: Boolean, default: true },
    scanlines: { type: Boolean, default: true }
  },
  
  // Privacy settings
  isPrivate: { type: Boolean, default: false },
  showOnlineStatus: { type: Boolean, default: true },
  allowDMs: { type: Boolean, default: true },
  
  // Blocked users
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  
  // Session
  lastActive: { type: Date, default: Date.now },
  isOnline: { type: Boolean, default: false }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate public profile (remove sensitive data)
userSchema.methods.toPublicProfile = function() {
  return {
    id: this._id,
    username: this.username,
    avatar: this.avatar,
    bio: this.bio,
    faction: this.faction,
    isVerified: this.isVerified,
    isCreator: this.isCreator,
    followersCount: this.followersCount,
    followingCount: this.followingCount,
    postsCount: this.postsCount,
    theme: this.theme,
    isOnline: this.isOnline,
    lastActive: this.lastActive
  };
};

module.exports = mongoose.model('User', userSchema);
