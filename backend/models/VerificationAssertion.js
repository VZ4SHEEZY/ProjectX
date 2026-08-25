const mongoose = require('mongoose');

const verificationAssertionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['age_over_18', 'creator_identity'], required: true },
  status: { type: String, enum: ['pending', 'verified', 'expired', 'revoked', 'failed'], required: true },
  provider: { type: String, maxlength: 50 },
  providerReference: { type: String, maxlength: 200, select: false },
  assertedAt: Date,
  expiresAt: Date,
  evidence: { type: mongoose.Schema.Types.Mixed, select: false }
}, { timestamps: true });

verificationAssertionSchema.index({ user: 1, type: 1, status: 1 });
verificationAssertionSchema.index({ expiresAt: 1 }, { sparse: true });

module.exports = mongoose.model('VerificationAssertion', verificationAssertionSchema);
