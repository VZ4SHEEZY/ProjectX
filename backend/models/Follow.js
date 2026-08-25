const mongoose = require('mongoose');

const followSchema = new mongoose.Schema({
  follower: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  followed: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  source: { type: String, enum: ['native', 'legacy_backfill'], default: 'native' }
}, { timestamps: true });

followSchema.index({ follower: 1, followed: 1 }, { unique: true });
followSchema.index({ followed: 1, createdAt: -1 });

module.exports = mongoose.model('Follow', followSchema);
