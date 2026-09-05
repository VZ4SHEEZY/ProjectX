'use strict';

const mongoose = require('mongoose');

const progressionOutboxSchema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true, immutable: true },
  event: { type: mongoose.Schema.Types.Mixed, required: true, immutable: true, select: false },
  evidence: { type: [mongoose.Schema.Types.Mixed], default: [], immutable: true, select: false },
  status: { type: String, enum: ['pending', 'processing', 'processed', 'failed'], default: 'pending', index: true },
  attempts: { type: Number, default: 0 },
  availableAt: { type: Date, default: Date.now, index: true },
  lockedAt: Date,
  processedAt: Date,
  lastError: { type: String, maxlength: 1000 }
}, { timestamps: true, collection: 'progression_outbox' });

progressionOutboxSchema.index({ status: 1, availableAt: 1, createdAt: 1, eventId: 1 }, { name: 'progression_outbox_delivery_v1' });

for (const operation of ['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne']) {
  progressionOutboxSchema.pre(operation, function rejectPayloadRewrite(next) {
    const update = this.getUpdate() || {};
    const paths = [...Object.keys(update), ...Object.keys(update.$set || {}), ...Object.keys(update.$unset || {})];
    if (operation === 'replaceOne' || paths.some(path => ['eventId', 'event', 'evidence'].some(field => path === field || path.startsWith(`${field}.`)))) return next(new Error('progression outbox payload is immutable'));
    next();
  });
}

module.exports = mongoose.model('ProgressionOutbox', progressionOutboxSchema);
