'use strict';
const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  proposalId: { type: String, required: true, unique: true, immutable: true }, requestId: { type: String, required: true, unique: true, immutable: true },
  agentId: { type: String, required: true, immutable: true }, proposalType: { type: String, enum: ['post', 'faction_event'], required: true, immutable: true },
  contractVersion: { type: String, required: true, immutable: true }, payload: { type: mongoose.Schema.Types.Mixed, required: true, immutable: true },
  status: { type: String, enum: ['pending_policy', 'pending_moderation', 'approved', 'rejected', 'executed', 'cancelled'], default: 'pending_policy' },
  policyDecision: { type: mongoose.Schema.Types.Mixed, default: null }, canonicalResultRef: { type: String, default: null }
}, { timestamps: true, strict: 'throw', minimize: false, collection: 'outrider_proposals' });
schema.index({ agentId: 1, createdAt: -1 });
module.exports = mongoose.model('OutriderProposal', schema);
