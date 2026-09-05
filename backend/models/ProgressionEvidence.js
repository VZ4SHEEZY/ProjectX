'use strict';

const mongoose = require('mongoose');
const { applyAppendOnlyGuards } = require('./progressionAppendOnly');

const progressionEvidenceSchema = new mongoose.Schema({
  evidenceId: { type: String, required: true },
  evidenceDigest: { type: String, required: true },
  type: { type: String, required: true },
  contractVersion: { type: String, required: true },
  producer: { type: String, required: true },
  generation: { type: String, required: true },
  subjectType: { type: String, required: true },
  subjectId: { type: String, required: true },
  observedAt: { type: String, required: true },
  supersedesEvidenceId: { type: String, default: null },
  privacyClassification: { type: String, required: true, select: false },
  retentionClass: { type: String, required: true, select: false },
  canonicalPayload: { type: mongoose.Schema.Types.Mixed, required: true, select: false },
  persistedAt: { type: Date, required: true, default: Date.now, immutable: true }
}, { strict: 'throw', minimize: false, versionKey: false, collection: 'progression_evidence' });

progressionEvidenceSchema.index({ evidenceId: 1 }, { unique: true, name: 'evidenceId_1' });
progressionEvidenceSchema.index({ evidenceDigest: 1 }, { unique: true, name: 'evidenceDigest_1' });
progressionEvidenceSchema.index({ subjectType: 1, subjectId: 1, observedAt: 1, evidenceId: 1 }, { name: 'evidence_subject_order_v1' });
progressionEvidenceSchema.index({ supersedesEvidenceId: 1 }, { sparse: true, name: 'supersedesEvidenceId_1' });
applyAppendOnlyGuards(progressionEvidenceSchema, 'progression evidence');

module.exports = mongoose.model('ProgressionEvidence', progressionEvidenceSchema);
