const mongoose = require('mongoose');

const walletChallengeSchema = new mongoose.Schema({
  challengeId: { type: String, required: true, unique: true, index: true },
  nonce: { type: String, required: true, unique: true, index: true },
  address: { type: String, required: true, lowercase: true, index: true },
  domain: { type: String, required: true },
  uri: { type: String, required: true },
  chainId: { type: Number, required: true },
  message: { type: String, required: true },
  issuedAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  usedAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('WalletChallenge', walletChallengeSchema);
