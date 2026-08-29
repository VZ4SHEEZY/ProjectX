'use strict';

const crypto = require('node:crypto');

const ACTIVITY_CLASSES = Object.freeze(['CREATE', 'ENGAGE', 'ACHIEVE', 'TRANSACT']);
const QUALIFICATION_STATES = Object.freeze(['quarantined', 'qualified', 'diminished', 'rejected']);
const AFFILIATION_STATES = Object.freeze(['affiliated', 'unaffiliated', 'unknown']);
const CORRECTION_TYPES = Object.freeze(['moderation_reversal', 'reversal', 'refund', 'chargeback', 'chain_reorganization', 'supersession', 'amendment', 'compensation']);
const ECONOMIC_STATES = Object.freeze(['intent', 'pending', 'confirmed', 'finalized', 'failed', 'refund', 'chargeback', 'chain_reorganization', 'reversed']);
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
  const provenance = input.provenance || { producer: 'release-3a-simulator', authority: 'synthetic-fixture' };
  const source = input.sourceIdentity || (input.correction ? {
    objectType: 'activity_event_correction',
    objectId: input.correction.targetEventId,
    transition: input.correction.type,
    version: `${input.correction.authorityVersion}:${input.correction.sequence}`
  } : {
    objectType: input.object?.type || input.subject?.type || 'synthetic_activity',
    objectId: input.object?.id || input.subject?.id || input.idempotencyKey,
    transition: input.eventType,
    version: input.sourceVersion || '1'
  });
  const identity = { producer: provenance.producer, activityClass: input.activityClass, eventType: input.eventType, source, schemaVersion: input.schemaVersion || '1.2.0' };
  validateIdentity(identity);
  return identity;
}

function canonicalEvent(input) {
  const allowedInput = ['eventId', 'idempotencyKey', 'schemaVersion', 'eventType', 'activityClass', 'actorId', 'subject', 'object', 'beneficiaryId', 'occurredAt', 'ingestedAt', 'affiliations', 'actorAffiliation', 'beneficiaryAffiliation', 'provenance', 'sourceIdentity', 'sourceVersion', 'evidenceRefs', 'economic', 'correction', 'facts'];
  if (!exactKeys(input, allowedInput)) throw new TypeError('raw activity event input contains unsupported properties');
  for (const forbidden of ['qualification', 'policyVersion', 'attributes', 'hiddenAllegianceWeight']) if (forbidden in input) throw new TypeError(`raw activity event input cannot contain ${forbidden}`);
  const identity = canonicalIdentity(input);
  const canonicalKey = stableJson(identity);
  const derivedEventId = stableId(canonicalKey);
  if (input.eventId && input.eventId !== derivedEventId) throw new TypeError('eventId must match the canonical producer-scoped identity');
  const event = {
    eventId: derivedEventId,
    idempotencyKey: canonicalKey,
    schemaVersion: input.schemaVersion || '1.2.0',
    eventType: input.eventType,
    activityClass: input.activityClass,
    actorId: input.actorId,
    subject: input.subject || null,
    object: input.object || null,
    beneficiaryId: input.beneficiaryId,
    occurredAt: input.occurredAt,
    ingestedAt: input.ingestedAt || input.occurredAt,
    affiliations: {
      actor: canonicalAffiliation(input.affiliations?.actor || input.actorAffiliation),
      beneficiary: canonicalAffiliation(input.affiliations?.beneficiary || input.beneficiaryAffiliation)
    },
    provenance: input.provenance || { producer: 'release-3a-simulator', authority: 'synthetic-fixture' },
    sourceIdentity: identity.source,
    evidenceRefs: uniqueStrings(input.evidenceRefs || []),
    economic: input.economic || null,
    correction: input.correction || null,
    facts: input.facts || {}
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
  if (affiliation.effectiveAt && !isCanonicalTimestamp(affiliation.effectiveAt)) throw new TypeError('affiliation effectiveAt must be canonical UTC ISO-8601');
  if (!exactKeys(affiliation, ['state', 'factionId', 'membershipRef', 'effectiveAt', 'source'])) throw new TypeError('affiliation snapshot contains unsupported fields');
  return { ...affiliation };
}

function validateIdentity(identity) {
  if (!identity.producer || !identity.activityClass || !identity.eventType || !identity.schemaVersion) throw new TypeError('event identity requires producer, activityClass, eventType, and schemaVersion');
  if (!identity.source || typeof identity.source !== 'object' || !identity.source.objectType || !identity.source.objectId || !identity.source.transition || !identity.source.version) throw new TypeError('event identity source requires objectType, objectId, transition, and version');
}

function validateEvent(event) {
  if (!exactKeys(event, ['eventId', 'idempotencyKey', 'schemaVersion', 'eventType', 'activityClass', 'actorId', 'subject', 'object', 'beneficiaryId', 'occurredAt', 'ingestedAt', 'affiliations', 'provenance', 'sourceIdentity', 'evidenceRefs', 'economic', 'correction', 'facts'])) throw new TypeError('raw activity event contains unsupported properties');
  const requiredStrings = ['eventId', 'idempotencyKey', 'schemaVersion', 'eventType', 'activityClass', 'actorId', 'beneficiaryId', 'occurredAt', 'ingestedAt'];
  for (const field of requiredStrings) if (typeof event[field] !== 'string' || !event[field]) throw new TypeError(`activity event ${field} must be a non-empty string`);
  if (!ACTIVITY_CLASSES.includes(event.activityClass)) throw new TypeError(`unsupported activityClass: ${event.activityClass}`);
  if (!isCanonicalTimestamp(event.occurredAt) || !isCanonicalTimestamp(event.ingestedAt)) throw new TypeError('activity timestamps must be canonical UTC ISO-8601');
  if (!event.provenance || !exactKeys(event.provenance, ['producer', 'authority', 'sourceEventId']) || !event.provenance.producer || !event.provenance.authority) throw new TypeError('provenance requires a producer and authority and forbids arbitrary fields');
  validateEntityRef(event.subject, 'subject');
  validateEntityRef(event.object, 'object');
  if (!event.sourceIdentity || !exactKeys(event.sourceIdentity, ['objectType', 'objectId', 'transition', 'version', 'actorId']) ) throw new TypeError('sourceIdentity contains unsupported fields');
  canonicalAffiliation(event.affiliations.actor);
  canonicalAffiliation(event.affiliations.beneficiary);
  if (event.economic) validateEconomic(event.economic);
  if (!event.facts || Object.keys(event.facts).length) throw new TypeError('raw event facts are closed in 3A.1; derived reach/trust/fraud inputs must be evidence references');
  if (event.correction) validateCorrection(event.correction, event.eventId);
  for (const forbidden of ['qualification', 'policyVersion', 'attributes', 'hiddenAllegianceWeight']) if (forbidden in event) throw new TypeError(`raw activity events cannot contain ${forbidden}`);
  return true;
}

function validateCorrection(correction, ownEventId) {
  if (!CORRECTION_TYPES.includes(correction.type)) throw new TypeError(`unsupported correction type: ${correction.type}`);
  if (!exactKeys(correction, ['targetEventId', 'type', 'effectiveAt', 'evidenceRefs', 'sequence', 'authorityVersion', 'replacementEventId', 'compensatingEventId'])) throw new TypeError('correction contains unsupported fields');
  for (const field of ['targetEventId', 'effectiveAt', 'authorityVersion']) if (typeof correction[field] !== 'string' || !correction[field]) throw new TypeError(`correction requires ${field}`);
  if (correction.targetEventId === ownEventId) throw new TypeError('correction cannot target itself');
  if (!Number.isInteger(correction.sequence) || correction.sequence < 1) throw new TypeError('correction sequence must be a positive integer');
  if (!isCanonicalTimestamp(correction.effectiveAt)) throw new TypeError('correction effectiveAt must be canonical UTC ISO-8601');
  if (!Array.isArray(correction.evidenceRefs) || correction.evidenceRefs.length === 0) throw new TypeError('correction requires evidenceRefs');
  if (['supersession', 'amendment'].includes(correction.type) && !correction.replacementEventId) throw new TypeError(`${correction.type} requires replacementEventId`);
  if (correction.type === 'compensation' && !correction.compensatingEventId) throw new TypeError('compensation requires compensatingEventId');
  if (correction.type !== 'compensation' && correction.compensatingEventId) throw new TypeError('compensatingEventId is only valid for compensation');
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
function isCanonicalTimestamp(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && new Date(value).toISOString() === value;
}
function exactKeys(value, allowed) { return value && typeof value === 'object' && Object.keys(value).every(key => allowed.includes(key)); }
function validateEntityRef(value, name) {
  if (value == null) return;
  if (!exactKeys(value, ['type', 'id']) || typeof value.type !== 'string' || !value.type || typeof value.id !== 'string' || !value.id) throw new TypeError(`${name} must be a closed entity reference`);
}
function validateEconomic(value) {
  if (!exactKeys(value, ['amountMinor', 'currency', 'state', 'finalityEvidenceRef'])) throw new TypeError('economic fact contains unsupported fields');
  if (!/^(0|[1-9]\d*)$/.test(value.amountMinor || '')) throw new TypeError('economic amountMinor must be a canonical non-negative integer string');
  if (!/^[A-Z]{3,8}$/.test(value.currency || '')) throw new TypeError('economic currency must be an uppercase currency/asset code');
  if (!ECONOMIC_STATES.includes(value.state)) throw new TypeError(`unsupported economic state: ${value.state}`);
  if (value.state === 'finalized' && !value.finalityEvidenceRef) throw new TypeError('finalized economic facts require finalityEvidenceRef');
}
function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);
  return value;
}

module.exports = { ACTIVITY_CLASSES, QUALIFICATION_STATES, AFFILIATION_STATES, CORRECTION_TYPES, ECONOMIC_STATES, SPECIALTIES, stableId, stableJson, canonicalIdentity, canonicalEvent, canonicalAffiliation, validateEvent, appendLogicalLedger, deepFreeze, isCanonicalTimestamp };
