'use strict';

const { deepFreeze, isCanonicalTimestamp, stableId, stableJson } = require('./contracts');

const EVIDENCE_TYPES = Object.freeze(['reach', 'moderation', 'fraud_trust', 'economic_finality']);
const PRIVACY_CLASSES = Object.freeze(['public_aggregate', 'internal', 'restricted', 'highly_restricted']);

function canonicalEvidence(input) {
  if (!EVIDENCE_TYPES.includes(input.type)) throw new TypeError(`unsupported evidence type: ${input.type}`);
  for (const field of ['contractVersion', 'producer', 'generation', 'observedAt', 'confidence', 'lineage', 'privacyClassification', 'retentionClass']) {
    if (input[field] == null || input[field] === '') throw new TypeError(`evidence requires ${field}`);
  }
  if (!isCanonicalTimestamp(input.observedAt)) throw new TypeError('evidence observedAt must be canonical UTC ISO-8601');
  if (!PRIVACY_CLASSES.includes(input.privacyClassification)) throw new TypeError('unsupported evidence privacy classification');
  if (typeof input.confidence !== 'number' || input.confidence < 0 || input.confidence > 1) throw new TypeError('evidence confidence must be between zero and one');
  const body = validateBody(input.type, input.body);
  const identity = { type: input.type, subject: input.subject, producer: input.producer, generation: input.generation, contractVersion: input.contractVersion, body };
  const digest = `sha256:${stableId(stableJson(identity))}`;
  if (input.evidenceDigest && input.evidenceDigest !== digest) throw new TypeError('evidence digest mismatch');
  return deepFreeze({ evidenceId: input.evidenceId || stableId(stableJson(identity)), ...identity, observedAt: input.observedAt, confidence: input.confidence, lineage: [...input.lineage], evidenceDigest: digest, supersedesEvidenceId: input.supersedesEvidenceId || null, privacyClassification: input.privacyClassification, retentionClass: input.retentionClass });
}

function validateBody(type, body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new TypeError('evidence body must be an object');
  if (type === 'reach') {
    const required = ['windowStart', 'windowEnd', 'deduplicationMethod', 'audienceAggregate', 'uniquePeople', 'uniqueFactions', 'sameFaction', 'crossFaction', 'unaffiliated', 'unknownOrIneligible', 'sourceChannel'];
    requireFields(body, required);
    if (!isCanonicalTimestamp(body.windowStart) || !isCanonicalTimestamp(body.windowEnd) || body.windowStart >= body.windowEnd) throw new TypeError('reach evidence requires a valid half-open observation window');
    for (const key of ['uniquePeople', 'uniqueFactions', 'sameFaction', 'crossFaction', 'unaffiliated', 'unknownOrIneligible']) if (!Number.isInteger(body[key]) || body[key] < 0) throw new TypeError(`reach ${key} must be a non-negative integer`);
  } else if (type === 'moderation') requireFields(body, ['outcome', 'authorityRef', 'caseRef']);
  else if (type === 'fraud_trust') requireFields(body, ['detectorVersion', 'signals']);
  else requireFields(body, ['state', 'authorityRef', 'transactionRef']);
  return { ...body };
}

function assertNonOverlappingReach(evidence) {
  const reach = evidence.filter(item => item.type === 'reach').sort((a, b) => a.subject.id.localeCompare(b.subject.id) || a.body.windowStart.localeCompare(b.body.windowStart));
  for (let i = 1; i < reach.length; i++) if (reach[i - 1].subject.id === reach[i].subject.id && reach[i].body.windowStart < reach[i - 1].body.windowEnd) throw new Error(`OVERLAPPING_REACH_WINDOWS:${reach[i].subject.id}`);
}

function requireFields(body, fields) { for (const field of fields) if (body[field] == null) throw new TypeError(`${field} is required`); }

module.exports = { EVIDENCE_TYPES, PRIVACY_CLASSES, canonicalEvidence, assertNonOverlappingReach };
