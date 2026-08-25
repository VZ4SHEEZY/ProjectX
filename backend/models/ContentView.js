const mongoose = require('mongoose');

const contentViewSchema = new mongoose.Schema({
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  viewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  trustClass: { type: String, enum: ['untrusted_engagement'], default: 'untrusted_engagement', immutable: true },
  progressionEligible: { type: Boolean, default: false, immutable: true },
  source: { type: String, enum: ['api_view'], default: 'api_view' }
}, { timestamps: true });

contentViewSchema.index({ post: 1, createdAt: -1 });
contentViewSchema.index({ viewer: 1, post: 1, createdAt: -1 });

module.exports = mongoose.model('ContentView', contentViewSchema);
