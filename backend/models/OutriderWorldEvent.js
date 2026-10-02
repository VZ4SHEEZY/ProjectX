'use strict';
const mongoose = require('mongoose');
const { applyAppendOnlyGuards } = require('./progressionAppendOnly');
const schema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true, immutable: true },
  contractVersion: { type: String, required: true, immutable: true },
  eventType: { type: String, required: true, immutable: true },
  spaceId: { type: String, required: true, immutable: true },
  actorAgentIds: { type: [String], default: [], immutable: true },
  observerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, immutable: true },
  visibility: { type: String, enum: ['public', 'authenticated', 'restricted'], required: true, immutable: true },
  occurredAt: { type: Date, required: true, immutable: true }, payload: { type: mongoose.Schema.Types.Mixed, required: true, immutable: true }
}, { timestamps: { createdAt: true, updatedAt: false }, strict: 'throw', minimize: false, collection: 'outrider_world_events' });
applyAppendOnlyGuards(schema, 'Outrider world events');
module.exports = mongoose.model('OutriderWorldEvent', schema);
