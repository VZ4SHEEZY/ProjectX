'use strict';

const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  operationKey: { type: String, required: true, unique: true, immutable: true },
  kind: { type: String, required: true, enum: ['backfill', 'rebuild'] },
  scope: { type: String, required: true, enum: ['global', 'user'] },
  subjectId: { type: String, default: null },
  status: { type: String, required: true, enum: ['pending', 'running', 'complete', 'failed'], default: 'pending' },
  cursor: { type: String, default: null },
  checkpoint: { type: mongoose.Schema.Types.Mixed, default: {} },
  stats: { type: mongoose.Schema.Types.Mixed, default: {} },
  policyIdentity: { type: mongoose.Schema.Types.Mixed, default: null },
  dryRun: { type: Boolean, default: false },
  lockedAt: { type: Date, default: null },
  lastHeartbeatAt: { type: Date, default: null },
  lastSuccessAt: { type: Date, default: null },
  lastError: { type: String, maxlength: 1000, default: null },
  durationMs: { type: Number, default: null }
}, { timestamps: true, collection: 'progression_operations', minimize: false });

schema.index({ kind: 1, status: 1, updatedAt: -1 }, { name: 'progression_operation_status_v1' });

module.exports = mongoose.model('ProgressionOperation', schema);
