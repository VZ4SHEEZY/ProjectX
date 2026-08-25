const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  displayName: { type: String, trim: true, maxlength: 50, default: '' },
  bio: { type: String, maxlength: 500, default: '' },
  avatar: { type: String, maxlength: 2048, default: '' },
  banner: { type: String, maxlength: 2048, default: '' },
  locationLabel: { type: String, maxlength: 100, default: '' },
  website: { type: String, maxlength: 200, default: '' },
  socialLinks: { type: Map, of: String, default: {} },
  privacy: { type: String, enum: ['public', 'followers', 'friends', 'private'], default: 'public' },
  source: { type: String, enum: ['native', 'legacy_backfill'], default: 'native' }
}, { timestamps: true });

module.exports = mongoose.model('Profile', profileSchema);
