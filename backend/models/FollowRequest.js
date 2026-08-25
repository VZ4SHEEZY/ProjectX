const mongoose = require('mongoose');

const followRequestSchema = new mongoose.Schema({
  requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'accepted', 'declined', 'cancelled'], default: 'pending' },
  respondedAt: Date
}, { timestamps: true });

followRequestSchema.index({ requester: 1, recipient: 1, status: 1 });
followRequestSchema.index({ recipient: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('FollowRequest', followRequestSchema);
