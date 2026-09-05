'use strict';

const mongoose = require('mongoose');
const { applyAppendOnlyGuards } = require('./progressionAppendOnly');

const progressionActivityEventSchema = new mongoose.Schema({
  eventId: { type: String, required: true },
  idempotencyKey: { type: String, required: true },
  schemaVersion: { type: String, required: true },
  eventType: { type: String, required: true },
  activityClass: { type: String, required: true },
  actorId: { type: String, required: true },
  beneficiaryId: { type: String, required: true },
  occurredAt: { type: String, required: true },
  ingestedAt: { type: String, required: true },
  producer: { type: String, required: true },
  correctionTargetEventId: { type: String, default: null },
  canonicalPayload: { type: mongoose.Schema.Types.Mixed, required: true },
  persistedAt: { type: Date, required: true, default: Date.now, immutable: true }
}, { strict: 'throw', minimize: false, versionKey: false, collection: 'progression_activity_events' });

progressionActivityEventSchema.index({ eventId: 1 }, { unique: true, name: 'eventId_1' });
progressionActivityEventSchema.index({ idempotencyKey: 1 }, { unique: true, name: 'idempotencyKey_1' });
progressionActivityEventSchema.index({ beneficiaryId: 1, occurredAt: 1, producer: 1, eventId: 1 }, { name: 'beneficiary_replay_order_v1' });
progressionActivityEventSchema.index({ correctionTargetEventId: 1 }, { sparse: true, name: 'correctionTargetEventId_1' });
applyAppendOnlyGuards(progressionActivityEventSchema, 'progression activity events');

module.exports = mongoose.model('ProgressionActivityEvent', progressionActivityEventSchema);
