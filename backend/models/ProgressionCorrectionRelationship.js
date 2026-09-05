'use strict';

const mongoose = require('mongoose');
const { applyAppendOnlyGuards } = require('./progressionAppendOnly');

const schema = new mongoose.Schema({
  correctionEventId: { type: String, required: true }, targetEventId: { type: String, required: true },
  type: { type: String, required: true }, sequence: { type: Number, required: true },
  authorityVersion: { type: String, required: true }, effectiveAt: { type: String, required: true },
  replacementEventId: { type: String, default: null }, compensatingEventId: { type: String, default: null },
  evidenceRefs: { type: [String], required: true }, persistedAt: { type: Date, required: true, default: Date.now, immutable: true }
}, { strict: 'throw', versionKey: false, collection: 'progression_correction_relationships' });

schema.index({ correctionEventId: 1 }, { unique: true, name: 'correctionEventId_1' });
schema.index({ targetEventId: 1, authorityVersion: 1, sequence: 1 }, { name: 'correction_target_order_v1' });
applyAppendOnlyGuards(schema, 'progression correction relationships');
module.exports = mongoose.model('ProgressionCorrectionRelationship', schema);
