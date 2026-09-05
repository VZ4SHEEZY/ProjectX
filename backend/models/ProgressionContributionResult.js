'use strict';

const mongoose = require('mongoose');
const { applyAppendOnlyGuards } = require('./progressionAppendOnly');

const schema = new mongoose.Schema({
  decisionId: { type: String, required: true }, eventId: { type: String, required: true },
  projectionContextId: { type: String, required: true }, beneficiaryId: { type: String, required: true },
  factionId: { type: String, default: null }, personal: { type: Number, required: true },
  faction: { type: Number, required: true }, canonicalPayload: { type: mongoose.Schema.Types.Mixed, required: true, select: false },
  persistedAt: { type: Date, required: true, default: Date.now, immutable: true }
}, { strict: 'throw', minimize: false, versionKey: false, collection: 'progression_contribution_results' });

schema.index({ decisionId: 1 }, { unique: true, name: 'decisionId_1' });
schema.index({ beneficiaryId: 1, projectionContextId: 1, eventId: 1 }, { name: 'personal_contribution_replay_v1' });
schema.index({ factionId: 1, projectionContextId: 1, eventId: 1 }, { sparse: true, name: 'faction_contribution_replay_v1' });
applyAppendOnlyGuards(schema, 'progression contribution results');
module.exports = mongoose.model('ProgressionContributionResult', schema);
