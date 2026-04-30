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
    enum: [
      'Neon Wraith', 'Iron Veil', 'Crimson Static', 'Void Circuit',
      'Gold Syndicate', 'Azure Phantom', 'Toxic Bloom', 'Scarlet Dominion',
      'Chrome Legion', 'Phantom Signal', 'Obsidian Pact', 'Ember Protocol',
      'Violet Surge', 'Steel Covenant', 'Binary Ghost', 'Copper Throne',
      'Nova Rift', 'Silver Wraith', 'Inferno Grid', 'Quantum Veil'
    ],
    default: 'Quantum Veil'
  },
  factionColor: { type: String, default: '#39FF14' },
  zodiacSign: { type: String, default: '' },
  dateOfBirth: { type: String, default: '' },
  
  // Verification
  isVerified: { type: Boolean, default: false },
  isAgeVerified: { type: Boolean, default: false },
  ageVerifiedAt: Date,
  
  // Privacy settings
  profilePrivacy: { type: String, enum: ['public', 'private'], default: 'public' },
  
  // Profile customization layout
  profileLayout: {
    leftZone: [String],      // Widget names in left column
    rightZone: [String],     // Widget names in right column
    bottomZone: [String],    // Widget names in bottom (posts grid locked here)
    hiddenWidgets: [String], // Widgets user hid
    mobileOrder: [String]    // Mobile vertical stack order
  },
  
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
    scanlines: { type: Boolean, default: true },
    // Profile page customization
    backgroundImage: { type: String, default: '' },
    customCss: { type: String, default: '' },
    cursorEffect: { type: String, default: 'sparkles' },
    layoutStyle: { type: String, default: 'grid' },
  },
  
  // Privacy settings
  isPrivate: { type: Boolean, default: false },
  showOnlineStatus: { type: Boolean, default: true },
  allowDMs: { type: Boolean, default: true },
  
  // Blocked users
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  
  // Notification settings
  notificationSettings: {
    newPost: { type: Boolean, default: true },
    likes: { type: Boolean, default: true },
    comments: { type: Boolean, default: true },
    follows: { type: Boolean, default: true },
    messages: { type: Boolean, default: true }
  },

  // Extended profile fields
  displayName: { type: String, maxlength: 50, default: '' },
  banner: { type: String, default: '' },
  location: { type: String, maxlength: 100, default: '' },
  website: { type: String, maxlength: 200, default: '' },
  socialLinks: {
    twitter: { type: String, default: '' },
    instagram: { type: String, default: '' },
    discord: { type: String, default: '' },
    telegram: { type: String, default: '' },
  },
  isActive: { type: Boolean, default: true },

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
    factionColor: this.factionColor,
    zodiacSign: this.zodiacSign,
    isVerified: this.isVerified,
    isCreator: this.isCreator,
    followersCount: this.followersCount,
    followingCount: this.followingCount,
    postsCount: this.postsCount,
    theme: this.theme,
    isOnline: this.isOnline,
    lastActive: this.lastActive,
    displayName: this.displayName,
    banner: this.banner,
    location: this.location,
    website: this.website,
    socialLinks: this.socialLinks,
    isActive: this.isActive,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('User', userSchema);
