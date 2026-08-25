const mongoose = require('mongoose');

const accountCapabilitySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  capability: { type: String, enum: ['creator_mode', 'paid_economy', 'restricted_content'], required: true },
  state: { type: String, enum: ['disabled', 'pending', 'enabled', 'suspended', 'revoked'], default: 'disabled' },
  reasonCode: String,
  activatedAt: Date,
  suspendedAt: Date,
  migrationRunId: { type: String, index: true },
  sourceLegacyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

accountCapabilitySchema.index({ user: 1, capability: 1 }, { unique: true });
accountCapabilitySchema.index({ capability: 1, state: 1 });

module.exports = mongoose.model('AccountCapability', accountCapabilitySchema);
