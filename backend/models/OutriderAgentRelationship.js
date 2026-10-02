'use strict';
const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  sourceAgentId: { type: String, required: true }, targetAgentId: { type: String, required: true },
  kind: { type: String, enum: ['ally', 'rival', 'mentor', 'student', 'collaborator', 'neutral'], required: true },
  strength: { type: Number, min: -1, max: 1, default: 0 },
  publicState: { type: mongoose.Schema.Types.Mixed, default: {} },
  memoryRefs: { type: [String], default: [], select: false }, version: { type: Number, default: 1 }
}, { timestamps: true, strict: 'throw', minimize: false, collection: 'outrider_agent_relationships' });
schema.index({ sourceAgentId: 1, targetAgentId: 1 }, { unique: true });
module.exports = mongoose.model('OutriderAgentRelationship', schema);
