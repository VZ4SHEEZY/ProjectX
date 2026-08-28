'use strict';

const crypto = require('node:crypto');

const ACTIVITY_CLASSES = Object.freeze(['CREATE', 'ENGAGE', 'ACHIEVE', 'TRANSACT']);
const QUALIFICATION_STATES = Object.freeze(['pending', 'quarantined', 'qualified', 'diminished', 'rejected', 'reversed']);
const SPECIALTIES = Object.freeze(['creation', 'social', 'influence', 'community', 'exploration', 'creator', 'economy', 'builder_ai', 'faction']);

function stableId(input) {
  return crypto.createHash('sha256').update(String(input)).digest('hex').slice(0, 32);
}

function canonicalEvent(input) {
  const event = {
    eventId: input.eventId || stableId(input.idempotencyKey),
    idempotencyKey: input.idempotencyKey,
    schemaVersion: input.schemaVersion || '1.0.0',
    eventType: input.eventType,
    activityClass: input.activityClass,
    actorId: input.actorId,
    subject: input.subject || null,
    object: input.object || null,
    beneficiaryId: input.beneficiaryId || input.actorId,
    occurredAt: input.occurredAt,
    ingestedAt: input.ingestedAt || input.occurredAt,
    factionAtEvent: input.factionAtEvent || null,
    provenance: input.provenance || { service: 'release-3a-simulator' },
    economic: input.economic || null,
    location: input.location || null,
    correctionOfEventId: input.correctionOfEventId || null,
    qualification: input.qualification || { state: 'pending', policyVersion: null, reasonCodes: [] },
    attributes: input.attributes || {}
  };
  validateEvent(event);
  return deepFreeze(event);
}

function validateEvent(event) {
  const requiredStrings = ['eventId', 'idempotencyKey', 'schemaVersion', 'eventType', 'activityClass', 'actorId', 'beneficiaryId', 'occurredAt', 'ingestedAt'];
  for (const field of requiredStrings) {
    if (typeof event[field] !== 'string' || event[field].length === 0) throw new TypeError(`activity event ${field} must be a non-empty string`);
  }
  if (!ACTIVITY_CLASSES.includes(event.activityClass)) throw new TypeError(`unsupported activityClass: ${event.activityClass}`);
  if (!QUALIFICATION_STATES.includes(event.qualification.state)) throw new TypeError(`unsupported qualification state: ${event.qualification.state}`);
  if (Number.isNaN(Date.parse(event.occurredAt)) || Number.isNaN(Date.parse(event.ingestedAt))) throw new TypeError('activity timestamps must be ISO-8601 compatible');
  if (event.economic && (!event.economic.currency || event.economic.amountMinor == null || !event.economic.status)) throw new TypeError('economic metadata requires currency, amountMinor, and status');
  return true;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);
  return value;
}

module.exports = { ACTIVITY_CLASSES, QUALIFICATION_STATES, SPECIALTIES, stableId, canonicalEvent, validateEvent, deepFreeze };
