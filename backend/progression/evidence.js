'use strict';

const crypto = require('node:crypto');
const { deepFreeze, isCanonicalTimestamp, stableId, stableJson } = require('./contracts');
const EVIDENCE_TYPES = Object.freeze(['reach', 'moderation', 'fraud_trust', 'economic_finality']);
const PRIVACY_CLASSES = Object.freeze(['public_aggregate', 'internal', 'restricted', 'highly_restricted']);
const FRAUD_TRUST_FIELDS = Object.freeze(['trustConfidence', 'valueSignal', 'engagementDiversity', 'linkedAccount', 'linkedWallet', 'circularTransfer', 'sybilConfidence', 'botGenerated', 'botDisclosure', 'velocityPerHour', 'repeatOrdinal', 'reciprocalDensity', 'sameFactionDensity', 'lowValueRatio', 'uniqueSupporters', 'moderated', 'abusive', 'reportManipulation']);

function canonicalEvidence(input) {
  requireOnly(input, ['evidenceId', 'type', 'contractVersion', 'subject', 'producer', 'generation', 'observedAt', 'confidence', 'lineage', 'evidenceDigest', 'supersedesEvidenceId', 'privacyClassification', 'retentionClass', 'body']);
  if (!EVIDENCE_TYPES.includes(input.type)) throw new TypeError(`unsupported evidence type: ${input.type}`);
  for (const field of ['contractVersion', 'producer', 'generation', 'observedAt', 'privacyClassification', 'retentionClass']) requireString(input[field], field);
  validateSubject(input.subject);
  if (!isCanonicalTimestamp(input.observedAt)) throw new TypeError('evidence observedAt must be canonical UTC ISO-8601');
  if (!PRIVACY_CLASSES.includes(input.privacyClassification)) throw new TypeError('unsupported evidence privacy classification');
  if (typeof input.confidence !== 'number' || input.confidence < 0 || input.confidence > 1) throw new TypeError('evidence confidence must be between zero and one');
  if (!Array.isArray(input.lineage) || !input.lineage.length || input.lineage.length > 32) throw new TypeError('evidence lineage must contain 1..32 references');
  input.lineage.forEach(value => requireString(value, 'lineage reference'));
  const body = validateBody(input.type, input.body);
  const material = { type: input.type, subject: input.subject, producer: input.producer, generation: input.generation, contractVersion: input.contractVersion, body };
  const digest = sha256(stableJson(material));
  const derivedId = stableId(stableJson({ producer: input.producer, type: input.type, subject: input.subject, generation: input.generation, contractVersion: input.contractVersion, digest }));
  if (input.evidenceDigest && input.evidenceDigest !== digest) throw new TypeError('evidence digest mismatch');
  if (input.evidenceId && input.evidenceId !== derivedId) throw new TypeError('evidenceId must match canonical evidence identity');
  if (input.supersedesEvidenceId != null && !/^[a-f0-9]{32}$/.test(input.supersedesEvidenceId)) throw new TypeError('supersedesEvidenceId must be a canonical ID');
  return deepFreeze({ evidenceId: derivedId, ...material, observedAt: input.observedAt, confidence: input.confidence, lineage: [...input.lineage], evidenceDigest: digest, supersedesEvidenceId: input.supersedesEvidenceId || null, privacyClassification: input.privacyClassification, retentionClass: input.retentionClass });
}

function validateBody(type, body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new TypeError('evidence body must be an object');
  if (type === 'reach') {
    const fields = ['windowStart', 'windowEnd', 'deduplicationMethod', 'audienceAggregate', 'uniquePeople', 'uniqueFactions', 'sameFaction', 'crossFaction', 'unaffiliated', 'unknownOrIneligible', 'sourceChannel', 'actorAffiliationRef', 'beneficiaryAffiliationRef'];
    requireFields(body, fields.slice(0, 11)); requireOnly(body, fields);
    if (!isCanonicalTimestamp(body.windowStart) || !isCanonicalTimestamp(body.windowEnd) || body.windowStart >= body.windowEnd) throw new TypeError('reach evidence requires a valid half-open observation window');
    for (const key of fields.slice(4, 10)) if (!Number.isSafeInteger(body[key]) || body[key] < 0) throw new TypeError(`reach ${key} must be a non-negative safe integer`);
  } else if (type === 'moderation') {
    requireFields(body, ['outcome', 'authorityRef', 'caseRef']); requireOnly(body, ['outcome', 'authorityRef', 'caseRef']);
  } else if (type === 'fraud_trust') {
    requireFields(body, ['detectorVersion', 'signals']); requireOnly(body, ['detectorVersion', 'signals']); requireOnly(body.signals, FRAUD_TRUST_FIELDS);
    for (const [key, value] of Object.entries(body.signals)) if (typeof value !== 'boolean' && (typeof value !== 'number' || !Number.isFinite(value))) throw new TypeError(`fraud/trust ${key} must be boolean or finite number`);
  } else {
    requireFields(body, ['state', 'authorityRef', 'transactionRef']); requireOnly(body, ['state', 'authorityRef', 'transactionRef', 'blockRef', 'confirmationDepth']);
  }
  return { ...body, ...(body.signals ? { signals: { ...body.signals } } : {}) };
}

function resolveEffectiveEvidence(values, options = {}) {
  const cutoff = options.cutoff || '9999-12-31T23:59:59.999Z';
  if (!isCanonicalTimestamp(cutoff)) throw new TypeError('evidence cutoff must be canonical UTC ISO-8601');
  const all = values.map(canonicalEvidence);
  const byId = new Map();
  for (const item of all) { const prior = byId.get(item.evidenceId); if (prior && prior.evidenceDigest !== item.evidenceDigest) throw new Error(`EVIDENCE_IDENTITY_COLLISION:${item.evidenceId}`); byId.set(item.evidenceId, item); }
  const superseded = new Set();
  for (const item of all) {
    if (!item.supersedesEvidenceId || item.observedAt > cutoff) continue;
    const prior = byId.get(item.supersedesEvidenceId);
    if (!prior) throw new Error(`EVIDENCE_SUPERSESSION_TARGET_NOT_FOUND:${item.supersedesEvidenceId}`);
    if (prior.type !== item.type || stableJson(prior.subject) !== stableJson(item.subject) || prior.producer !== item.producer || prior.contractVersion !== item.contractVersion) throw new Error('EVIDENCE_SUPERSESSION_LINEAGE_MISMATCH');
    if (item.generation <= prior.generation || item.observedAt < prior.observedAt) throw new Error('EVIDENCE_SUPERSESSION_ORDER_INVALID');
    let cursor = prior; const seen = new Set([item.evidenceId]);
    while (cursor) { if (seen.has(cursor.evidenceId)) throw new Error('EVIDENCE_SUPERSESSION_CYCLE'); seen.add(cursor.evidenceId); cursor = cursor.supersedesEvidenceId ? byId.get(cursor.supersedesEvidenceId) : null; }
    superseded.add(prior.evidenceId);
  }
  const evidence = all.filter(item => item.observedAt <= cutoff && !superseded.has(item.evidenceId)).sort((a, b) => a.evidenceId.localeCompare(b.evidenceId));
  return { evidence: deepFreeze(evidence), byId: new Map(evidence.map(item => [item.evidenceId, item])), digest: sha256(stableJson(evidence.map(item => ({ evidenceId: item.evidenceId, evidenceDigest: item.evidenceDigest })))) };
}

function validateEvidenceForEvent(event, evidence, options = {}) {
  const allowed = new Set(options.allowedTypes || EVIDENCE_TYPES);
  for (const item of evidence) {
    if (!allowed.has(item.type)) throw new Error(`EVIDENCE_TYPE_NOT_ALLOWED:${item.type}`);
    const bound = (event.object && item.subject.type === event.object.type && item.subject.id === event.object.id) || (event.subject && item.subject.type === event.subject.type && item.subject.id === event.subject.id);
    if (!bound) throw new Error(`EVIDENCE_SUBJECT_MISMATCH:${item.evidenceId}`);
    if (options.contractVersions?.[item.type] !== item.contractVersion) throw new Error(`EVIDENCE_VERSION_MISMATCH:${item.evidenceId}`);
    if (!options.producers?.[item.type]?.includes(item.producer)) throw new Error(`EVIDENCE_PRODUCER_UNAUTHORIZED:${item.evidenceId}`);
    if (options.generation && item.generation !== options.generation) throw new Error(`EVIDENCE_GENERATION_MISMATCH:${item.evidenceId}`);
  }
  if (event.economic?.state === 'finalized') {
    const finality = evidence.find(item => item.evidenceId === event.economic.finalityEvidenceRef && item.type === 'economic_finality');
    if (!finality || finality.body.state !== 'finalized' || finality.body.transactionRef !== event.object?.id) throw new Error(`ECONOMIC_FINALITY_EVIDENCE_INVALID:${event.eventId}`);
  }
  assertNonOverlappingReach(evidence);
}

function assertNonOverlappingReach(evidence) { const reach = evidence.filter(item => item.type === 'reach').sort((a, b) => a.subject.id.localeCompare(b.subject.id) || a.body.windowStart.localeCompare(b.body.windowStart)); for (let i = 1; i < reach.length; i++) if (reach[i - 1].subject.id === reach[i].subject.id && reach[i].body.windowStart < reach[i - 1].body.windowEnd) throw new Error(`OVERLAPPING_REACH_WINDOWS:${reach[i].subject.id}`); }
function requireFields(body, fields) { for (const field of fields) if (body[field] == null) throw new TypeError(`${field} is required`); }
function requireOnly(body, fields) { if (!body || typeof body !== 'object' || Array.isArray(body)) throw new TypeError('closed object required'); for (const field of Object.keys(body)) if (!fields.includes(field)) throw new TypeError(`unsupported evidence field: ${field}`); }
function requireString(value, name) { if (typeof value !== 'string' || !value || value.length > 256) throw new TypeError(`${name} must be a non-empty bounded string`); }
function validateSubject(subject) { requireOnly(subject, ['type', 'id']); requireString(subject.type, 'subject type'); requireString(subject.id, 'subject id'); }
function sha256(value) { return `sha256:${crypto.createHash('sha256').update(value).digest('hex')}`; }

module.exports = { EVIDENCE_TYPES, PRIVACY_CLASSES, FRAUD_TRUST_FIELDS, canonicalEvidence, resolveEffectiveEvidence, validateEvidenceForEvent, assertNonOverlappingReach };
