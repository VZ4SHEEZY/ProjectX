'use strict';

const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  leaseKey: { type: String, required: true, unique: true, immutable: true },
  ownerId: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  acquiredAt: { type: Date, required: true }
}, { strict: 'throw', versionKey: false, collection: 'progression_pipeline_leases' });

schema.index({ leaseKey: 1 }, { unique: true, name: 'leaseKey_1' });
schema.index({ expiresAt: 1 }, { name: 'lease_expiry_v1' });

module.exports = mongoose.model('ProgressionPipelineLease', schema);
