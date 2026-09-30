'use strict';
const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  agentId: { type: String, required: true, unique: true, immutable: true },
  displayIdentity: { name: { type: String, required: true }, avatar: String, description: String },
  agentType: { type: String, enum: ['faction', 'independent', 'guide', 'creator_bound', 'system'], required: true },
  factionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Faction', default: null },
  ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  runtime: { provider: String, model: String, version: String },
  memoryNamespace: { type: String, required: true, unique: true, immutable: true },
  worldState: { type: mongoose.Schema.Types.Mixed, default: {} },
  personalityConfig: { type: mongoose.Schema.Types.Mixed, default: {} },
  voiceConfig: { type: mongoose.Schema.Types.Mixed, default: {} },
  creativeConfig: { type: mongoose.Schema.Types.Mixed, default: {} },
  status: { type: String, enum: ['draft', 'active', 'suspended', 'retired'], default: 'draft' },
  version: { type: Number, required: true, default: 1 }
}, { timestamps: true, strict: 'throw', minimize: false, collection: 'outrider_agents' });
schema.pre('validate', function(next) {
  if (this.agentType === 'faction' && !this.factionId) return next(new Error('FACTION_AGENT_REQUIRES_FACTION'));
  if (this.agentType === 'independent' && this.factionId) return next(new Error('INDEPENDENT_AGENT_MUST_BE_UNAFFILIATED'));
  next();
});
schema.index({ factionId: 1 }, { unique: true, partialFilterExpression: { agentType: 'faction', factionId: { $type: 'objectId' } } });
module.exports = mongoose.model('OutriderAgent', schema);
