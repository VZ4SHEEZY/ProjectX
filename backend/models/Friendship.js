const mongoose = require('mongoose');

const friendshipSchema = new mongoose.Schema({
  userLow: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userHigh: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  acceptedRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'FriendRequest' }
}, { timestamps: true });

friendshipSchema.index({ userLow: 1, userHigh: 1 }, { unique: true });

module.exports = mongoose.model('Friendship', friendshipSchema);
