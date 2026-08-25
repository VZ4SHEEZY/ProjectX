const mongoose = require('mongoose');

const factionMembershipSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  faction: { type: mongoose.Schema.Types.ObjectId, ref: 'Faction', required: true },
  status: { type: String, enum: ['active', 'former'], default: 'active' },
  source: { type: String, enum: ['native', 'legacy_backfill'], default: 'native' },
  joinedAt: { type: Date, default: Date.now },
  endedAt: Date,
  migrationRunId: { type: String, index: true },
  sourceLegacyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

factionMembershipSchema.index({ user: 1, status: 1 }, { unique: true, partialFilterExpression: { status: 'active' } });
factionMembershipSchema.index({ faction: 1, status: 1 });

module.exports = mongoose.model('FactionMembership', factionMembershipSchema);
