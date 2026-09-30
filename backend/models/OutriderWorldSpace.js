'use strict';
const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  spaceId: { type: String, required: true, unique: true, immutable: true },
  name: { type: String, required: true }, description: String,
  kind: { type: String, enum: ['commons', 'faction', 'studio', 'event', 'private'], required: true },
  factionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Faction', default: null },
  visibility: { type: String, enum: ['public', 'authenticated', 'restricted'], default: 'public' },
  state: { type: mongoose.Schema.Types.Mixed, default: {} },
  presentAgentIds: { type: [String], default: [] },
  version: { type: Number, default: 1 }
}, { timestamps: true, strict: 'throw', minimize: false, collection: 'outrider_world_spaces' });
module.exports = mongoose.model('OutriderWorldSpace', schema);
