const mongoose = require('mongoose');

const creatorSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  state: { type: String, enum: ['pending', 'active', 'suspended', 'revoked'], required: true },
  applicationDate: Date,
  approvedDate: Date,
  source: { type: String, enum: ['native', 'legacy_backfill'], default: 'native' },
  migrationRunId: { type: String, index: true },
  sourceLegacyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

creatorSchema.index({ state: 1, createdAt: -1 });

module.exports = mongoose.model('Creator', creatorSchema);
