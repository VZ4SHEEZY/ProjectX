const mongoose = require('mongoose');

const profileModuleSchema = new mongoose.Schema({
  profile: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', required: true },
  type: { type: String, enum: ['identity', 'bio', 'faction', 'top_friends', 'posts', 'media', 'links', 'creator_summary'], required: true },
  position: { type: Number, min: 0, required: true },
  enabled: { type: Boolean, default: true },
  config: { type: mongoose.Schema.Types.Mixed, default: {} },
  accessRule: { type: mongoose.Schema.Types.ObjectId, ref: 'AccessRule', default: null },
  schemaVersion: { type: Number, default: 1 }
}, { timestamps: true, minimize: false });

profileModuleSchema.index({ profile: 1, position: 1 }, { unique: true });
profileModuleSchema.index({ profile: 1, type: 1 });

module.exports = mongoose.model('ProfileModule', profileModuleSchema);
