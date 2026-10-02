'use strict';
const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  memoryId: { type: String, required: true, unique: true, immutable: true },
  namespace: { type: String, required: true, immutable: true },
  agentId: { type: String, required: true, immutable: true },
  kind: { type: String, enum: ['permitted_fact', 'interaction_summary'], required: true, immutable: true },
  content: { type: String, required: true, maxlength: 2000, immutable: true },
  sourceExecutionId: { type: String, required: true, immutable: true },
  sourceEventId: { type: String, default: null, immutable: true },
  visibility: { type: String, enum: ['agent_private', 'shared'], default: 'agent_private', immutable: true },
  recordedAt: { type: Date, required: true, immutable: true }
}, { timestamps: { createdAt: true, updatedAt: false }, strict: 'throw', collection: 'outrider_agent_memories' });
schema.index({ namespace: 1, recordedAt: -1 });
schema.index({ agentId: 1, sourceExecutionId: 1 });
module.exports = mongoose.model('OutriderAgentMemory', schema);
