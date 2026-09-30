'use strict';
const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true, immutable: true },
  observerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  spaceId: { type: String, required: true }, status: { type: String, enum: ['active', 'ended', 'revoked'], default: 'active' },
  startedAt: { type: Date, default: Date.now, immutable: true }, endedAt: Date,
  accessContext: { type: mongoose.Schema.Types.Mixed, default: {}, select: false }
}, { timestamps: true, strict: 'throw', minimize: false, collection: 'outrider_observer_sessions' });
schema.index({ observerUserId: 1, status: 1 });
module.exports = mongoose.model('OutriderObserverSession', schema);
