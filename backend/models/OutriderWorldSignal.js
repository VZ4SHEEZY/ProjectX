'use strict';
const mongoose = require('mongoose');
const { applyAppendOnlyGuards } = require('./progressionAppendOnly');
const schema = new mongoose.Schema({
  signalId: { type: String, required: true, unique: true, immutable: true }, contractVersion: { type: String, required: true, immutable: true },
  signalType: { type: String, required: true, immutable: true }, source: { type: String, required: true, immutable: true },
  subject: { type: mongoose.Schema.Types.Mixed, required: true, immutable: true }, visibility: { type: String, enum: ['public', 'agent_permitted'], required: true, immutable: true },
  occurredAt: { type: Date, required: true, immutable: true }, payload: { type: mongoose.Schema.Types.Mixed, required: true, immutable: true }
}, { timestamps: { createdAt: 'ingestedAt', updatedAt: false }, strict: 'throw', minimize: false, collection: 'outrider_world_signals' });
applyAppendOnlyGuards(schema, 'Outrider world signals');
module.exports = mongoose.model('OutriderWorldSignal', schema);
