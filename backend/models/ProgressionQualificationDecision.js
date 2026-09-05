'use strict';

const mongoose = require('mongoose');
const { applyAppendOnlyGuards } = require('./progressionAppendOnly');

const schema = new mongoose.Schema({
  decisionId: { type: String, required: true }, eventId: { type: String, required: true },
  policyId: { type: String, required: true }, policyVersion: { type: String, required: true },
  policyArtifactDigest: { type: String, required: true }, projectionContextId: { type: String, required: true },
  evaluationGeneration: { type: String, required: true }, evidenceGeneration: { type: String, required: true },
  correctionGraphGeneration: { type: String, required: true }, evaluatedAt: { type: String, required: true },
  state: { type: String, required: true }, canonicalPayload: { type: mongoose.Schema.Types.Mixed, required: true, select: false },
  persistedAt: { type: Date, required: true, default: Date.now, immutable: true }
}, { strict: 'throw', minimize: false, versionKey: false, collection: 'progression_qualification_decisions' });

schema.index({ decisionId: 1 }, { unique: true, name: 'decisionId_1' });
schema.index({ eventId: 1, projectionContextId: 1 }, { unique: true, name: 'event_context_1' });
schema.index({ projectionContextId: 1, eventId: 1 }, { name: 'context_event_1' });
applyAppendOnlyGuards(schema, 'progression qualification decisions');
module.exports = mongoose.model('ProgressionQualificationDecision', schema);
