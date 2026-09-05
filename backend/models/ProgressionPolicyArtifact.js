'use strict';

const mongoose = require('mongoose');
const { applyAppendOnlyGuards } = require('./progressionAppendOnly');

const schema = new mongoose.Schema({
  policyId: { type: String, required: true }, version: { type: String, required: true },
  artifactDigest: { type: String, required: true }, codeDigest: { type: String, required: true },
  canonicalPayload: { type: mongoose.Schema.Types.Mixed, required: true, select: false },
  persistedAt: { type: Date, required: true, default: Date.now, immutable: true }
}, { strict: 'throw', minimize: false, versionKey: false, collection: 'progression_policy_artifacts' });

schema.index({ artifactDigest: 1 }, { unique: true, name: 'artifactDigest_1' });
schema.index({ policyId: 1, version: 1 }, { unique: true, name: 'policy_version_1' });
applyAppendOnlyGuards(schema, 'progression policy artifacts');
module.exports = mongoose.model('ProgressionPolicyArtifact', schema);
