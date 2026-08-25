const mongoose = require('mongoose');

const platformRoleSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['moderator', 'admin', 'platform_owner'], required: true },
  state: { type: String, enum: ['active', 'suspended', 'revoked'], default: 'active' },
  grantedAt: { type: Date, default: Date.now },
  grantedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reasonCode: String,
  source: { type: String, enum: ['native', 'legacy_backfill'], default: 'native' },
  migrationRunId: { type: String, index: true },
  sourceLegacyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

platformRoleSchema.index({ user: 1, role: 1 }, { unique: true });
platformRoleSchema.index({ role: 1, state: 1 });

module.exports = mongoose.model('PlatformRole', platformRoleSchema);
