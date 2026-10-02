'use strict';
const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  executionId: { type: String, required: true, unique: true, immutable: true },
  runId: { type: String, required: true, immutable: true },
  agentId: { type: String, required: true, immutable: true },
  tick: { type: Number, required: true, min: 0, immutable: true },
  runtime: { provider: String, model: String, version: String, deterministic: Boolean },
  perceivedEventIds: { type: [String], default: [], immutable: true },
  action: { type: String, required: true, immutable: true },
  actionInput: { type: mongoose.Schema.Types.Mixed, default: {}, immutable: true },
  resultRefs: { type: [String], default: [], immutable: true },
  status: { type: String, enum: ['completed', 'denied', 'failed'], required: true, immutable: true },
  resourceUsage: { tokens: { type: Number, default: 0 }, actions: { type: Number, default: 0 }, elapsedMs: { type: Number, default: 0 } },
  occurredAt: { type: Date, required: true, immutable: true }
}, { timestamps: { createdAt: true, updatedAt: false }, strict: 'throw', minimize: false, collection: 'outrider_agent_executions' });
schema.index({ runId: 1, tick: 1, agentId: 1 }, { unique: true });
schema.index({ agentId: 1, occurredAt: -1 });
module.exports = mongoose.model('OutriderAgentExecution', schema);
