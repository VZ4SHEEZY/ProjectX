'use strict';

const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  scope: { type: String, required: true, enum: ['personal', 'faction'] },
  subjectId: { type: String, required: true }, projectionContextId: { type: String, required: true },
  policyId: { type: String, required: true }, policyVersion: { type: String, required: true },
  policyArtifactDigest: { type: String, required: true }, evaluationGeneration: { type: String, required: true },
  projectionContext: { type: mongoose.Schema.Types.Mixed, required: true, select: false },
  checkpoint: { type: mongoose.Schema.Types.Mixed, required: true, select: false },
  rebuiltAt: { type: Date, required: true, default: Date.now }
}, { strict: 'throw', minimize: false, versionKey: false, collection: 'progression_projections' });

schema.index({ scope: 1, subjectId: 1, projectionContextId: 1 }, { unique: true, name: 'projection_checkpoint_1' });
schema.index({ scope: 1, subjectId: 1, rebuiltAt: -1 }, { name: 'projection_latest_1' });
module.exports = mongoose.model('ProgressionProjection', schema);
