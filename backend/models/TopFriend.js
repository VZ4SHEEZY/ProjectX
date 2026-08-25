const mongoose = require('mongoose');

const topFriendSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  friend: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  position: { type: Number, required: true, min: 0, max: 7 }
}, { timestamps: true });

topFriendSchema.index({ owner: 1, friend: 1 }, { unique: true });
topFriendSchema.index({ owner: 1, position: 1 }, { unique: true });

module.exports = mongoose.model('TopFriend', topFriendSchema);
