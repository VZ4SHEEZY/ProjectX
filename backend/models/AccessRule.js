const mongoose = require('mongoose');

const accessRuleSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  effect: { type: String, enum: ['allow', 'deny'], default: 'allow' },
  audience: { type: String, enum: ['everyone', 'followers', 'friends', 'same_faction', 'age_verified', 'subscribers', 'creator_tier', 'owner'], required: true },
  creatorTierId: { type: mongoose.Schema.Types.ObjectId },
  enabled: { type: Boolean, default: true }
}, { timestamps: true });

accessRuleSchema.index({ owner: 1, audience: 1, enabled: 1 });

module.exports = mongoose.model('AccessRule', accessRuleSchema);
