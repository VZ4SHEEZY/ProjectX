'use strict';
const mongoose = require('mongoose');
const { CAPABILITIES } = require('../outrider/contracts');
const schema = new mongoose.Schema({
  grantId: { type: String, required: true, unique: true, immutable: true },
  agentId: { type: String, required: true, immutable: true },
  capability: { type: String, required: true, enum: Object.values(CAPABILITIES), immutable: true },
  constraints: { type: mongoose.Schema.Types.Mixed, default: {}, immutable: true },
  state: { type: String, enum: ['active', 'suspended', 'revoked'], default: 'active' },
  policyVersion: { type: String, required: true, immutable: true },
  grantedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  expiresAt: { type: Date, default: null }
}, { timestamps: true, strict: 'throw', minimize: false, collection: 'outrider_capability_grants' });
schema.index({ agentId: 1, capability: 1, state: 1 });
module.exports = mongoose.model('OutriderCapabilityGrant', schema);
