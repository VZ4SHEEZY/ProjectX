'use strict';

const crypto = require('node:crypto');

const ACTIVITY_CLASSES = Object.freeze(['CREATE', 'ENGAGE', 'ACHIEVE', 'TRANSACT']);
const QUALIFICATION_STATES = Object.freeze(['quarantined', 'qualified', 'diminished', 'rejected']);
const AFFILIATION_STATES = Object.freeze(['affiliated', 'unaffiliated', 'unknown']);
const CORRECTION_TYPES = Object.freeze(['moderation_reversal', 'reversal', 'refund', 'chargeback', 'supersession', 'amendment']);
const SPECIALTIES = Object.freeze(['creation', 'social', 'influence', 'community', 'exploration', 'creator', 'economy', 'builder_ai', 'faction']);

function stableId(input) {
  return crypto.createHash('sha256').update(String(input)).digest('hex').slice(0, 32);
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function canonicalIdentity(input) {
  const provenance = input.provenance || { service: 'release-3a-simulator' };
  const source = input.sourceIdentity || {
    objectType: input.object?.type || input.subject?.type || 'synthetic_activity',
    objectId: input.object?.id || input.subject?.id || input.idempotencyKey,
    transition: input.eventType,
    version: input.sourceVersion || '1'
  };
  if (input.idempotencyKey && !input.sourceIdentity) source.legacyKey = input.idempotencyKey;
  const identity = { producer: provenance.service, activityClass: input.activityClass, eventType: input.eventType, source, schemaVersion: input.schemaVersion || '1.1.0' };
  validateIdentity(identity);
  return identity;
}

function canonicalEvent(input) {
  const identity = canonicalIdentity(input);
  const canonicalKey = stableJson(identity);
  const event = {
    eventId: input.eventId || stableId(canonicalKey),
    idempotencyKey: canonicalKey,
    schemaVersion: input.schemaVersion || '1.1.0',
    eventType: input.eventType,
    activityClass: input.activityClass,
    actorId: input.actorId,
    subject: input.subject || null,
    object: input.object || null,
    beneficiaryId: input.beneficiaryId || input.actorId,
    occurredAt: input.occurredAt,
    ingestedAt: input.ingestedAt || input.occurredAt,
    affiliations: {
      actor: canonicalAffiliation(input.affiliations?.actor || input.actorAffiliation),
      beneficiary: canonicalAffiliation(input.affiliations?.beneficiary || input.beneficiaryAffiliation)
    },
    provenance: input.provenance || { service: 'release-3a-simulator' },
    sourceIdentity: identity.source,
    evidenceRefs: uniqueStrings(input.evidenceRefs || []),
    economic: input.economic || null,
    correction: input.correction || null,
    attributes: input.attributes || {}
  };
  validateEvent(event);
  return deepFreeze(event);
}

function canonicalAffiliation(value) {
  const affiliation = value || { state: 'unknown' };
  if (!AFFILIATION_STATES.includes(affiliation.state)) throw new TypeError(`unsupported affiliation state: ${affiliation.state}`);
  if (affiliation.state === 'affiliated') {
    for (const field of ['factionId', 'effectiveAt', 'source']) if (typeof affiliation[field] !== 'string' || !affiliation[field]) throw new TypeError(`affiliated snapshot requires ${field}`);
  } else if (affiliation.factionId != null) throw new TypeError(`${affiliation.state} snapshot cannot contain factionId`);
  return { ...affiliation };
}

function validateIdentity(identity) {
  if (!identity.producer || !identity.activityClass || !identity.eventType || !identity.schemaVersion) throw new TypeError('event identity requires producer, activityClass, eventType, and schemaVersion');
  if (!identity.source || typeof identity.source !== 'object' || !identity.source.objectType || !identity.source.objectId || !identity.source.transition || !identity.source.version) throw new TypeError('event identity source requires objectType, objectId, transition, and version');
}

function validateEvent(event) {
  const requiredStrings = ['eventId', 'idempotencyKey', 'schemaVersion', 'eventType', 'activityClass', 'actorId', 'beneficiaryId', 'occurredAt', 'ingestedAt'];
  for (const field of requiredStrings) if (typeof event[field] !== 'string' || !event[field]) throw new TypeError(`activity event ${field} must be a non-empty string`);
  if (!ACTIVITY_CLASSES.includes(event.activityClass)) throw new TypeError(`unsupported activityClass: ${event.activityClass}`);
  if (Number.isNaN(Date.parse(event.occurredAt)) || Number.isNaN(Date.parse(event.ingestedAt))) throw new TypeError('activity timestamps must be ISO-8601 compatible');
  canonicalAffiliation(event.affiliations.actor);
  canonicalAffiliation(event.affiliations.beneficiary);
  if (event.economic && (!event.economic.currency || event.economic.amountMinor == null || !event.economic.status)) throw new TypeError('economic metadata requires currency, amountMinor, and status');
  if (event.correction) validateCorrection(event.correction, event.eventId);
  if ('qualification' in event || 'policyVersion' in event) throw new TypeError('raw activity events cannot contain policy interpretation');
  return true;
}

function validateCorrection(correction, ownEventId) {
  if (!CORRECTION_TYPES.includes(correction.type)) throw new TypeError(`unsupported correction type: ${correction.type}`);
  for (const field of ['targetEventId', 'authority', 'effectiveAt']) if (typeof correction[field] !== 'string' || !correction[field]) throw new TypeError(`correction requires ${field}`);
  if (correction.targetEventId === ownEventId) throw new TypeError('correction cannot target itself');
  if (!Number.isInteger(correction.sequence) || correction.sequence < 1) throw new TypeError('correction sequence must be a positive integer');
  if (Number.isNaN(Date.parse(correction.effectiveAt))) throw new TypeError('correction effectiveAt must be ISO-8601 compatible');
  if (!Array.isArray(correction.evidenceRefs) || correction.evidenceRefs.length === 0) throw new TypeError('correction requires evidenceRefs');
  if (['supersession', 'amendment'].includes(correction.type) && !correction.replacementEventId) throw new TypeError(`${correction.type} requires replacementEventId`);
}

function appendLogicalLedger(events) {
  const byEventId = new Map();
  const byKey = new Map();
  for (const event of events) {
    validateEvent(event);
    const fingerprint = stableJson(event);
    for (const [index, key] of [['eventId', event.eventId], ['idempotencyKey', event.idempotencyKey]]) {
      const prior = (index === 'eventId' ? byEventId : byKey).get(key);
      if (prior && prior.fingerprint !== fingerprint) throw new Error(`EVENT_IDENTITY_COLLISION:${index}:${key}`);
    }
    if (!byEventId.has(event.eventId) && !byKey.has(event.idempotencyKey)) {
      const entry = { event, fingerprint };
      byEventId.set(event.eventId, entry);
      byKey.set(event.idempotencyKey, entry);
    }
  }
  return [...byEventId.values()].map(entry => entry.event);
}

function uniqueStrings(values) { return [...new Set(values)].sort(); }
function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);
  return value;
}

module.exports = { ACTIVITY_CLASSES, QUALIFICATION_STATES, AFFILIATION_STATES, CORRECTION_TYPES, SPECIALTIES, stableId, stableJson, canonicalIdentity, canonicalEvent, canonicalAffiliation, validateEvent, appendLogicalLedger, deepFreeze };
