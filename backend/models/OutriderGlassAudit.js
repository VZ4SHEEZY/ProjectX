'use strict';
const mongoose = require('mongoose');
const { applyAppendOnlyGuards } = require('./progressionAppendOnly');
const schema = new mongoose.Schema({
  requestId: { type: String, required: true }, agentId: { type: String, default: null }, capability: { type: String, required: true },
  contractVersion: { type: String, default: null }, correlationId: { type: String, default: null },
  outcome: { type: String, enum: ['allowed', 'denied'], required: true }, reason: { type: String, default: null }, occurredAt: { type: Date, required: true }
}, { timestamps: { createdAt: true, updatedAt: false }, strict: 'throw', collection: 'outrider_glass_audit' });
schema.index({ requestId: 1, occurredAt: -1 }); schema.index({ agentId: 1, occurredAt: -1 });
applyAppendOnlyGuards(schema, 'Glass audit records');
module.exports = mongoose.model('OutriderGlassAudit', schema);
