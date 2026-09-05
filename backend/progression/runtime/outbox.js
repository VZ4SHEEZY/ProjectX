'use strict';

const mongoose = require('mongoose');
const ProgressionOutbox = require('../../models/ProgressionOutbox');
const { produceActivity } = require('./event-producer');

async function withProgressionOutbox(operation) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => { result = await operation({ session, enqueue: spec => enqueue(spec, { session }) }); });
    return result;
  } finally { await session.endSession(); }
}

async function enqueue(spec, { session } = {}) {
  if (!session || typeof session.inTransaction !== 'function' || !session.inTransaction()) throw new Error('PROGRESSION_OUTBOX_ACTIVE_SESSION_REQUIRED');
  const payload = await produceActivity(spec, { session });
  try {
    return (await ProgressionOutbox.create([{ eventId: payload.event.eventId, event: payload.event, evidence: payload.evidence }], { session }))[0];
  } catch (error) {
    if (error?.code !== 11000) throw error;
    return ProgressionOutbox.findOne({ eventId: payload.event.eventId }).session(session);
  }
}

module.exports = Object.freeze({ withProgressionOutbox, enqueue });
