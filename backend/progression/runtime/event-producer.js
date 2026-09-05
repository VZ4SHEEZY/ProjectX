'use strict';

const { canonicalIdentity, stableId } = require('../contracts');
const { ingestRuntime } = require('../producer-internal');
const FactionMembership = require('../../models/FactionMembership');

const PRINCIPALS = Object.freeze({
  user: Object.freeze({ principalId: 'user_api', producer: 'user-api', authority: 'APPLICATION', domain: 'user' }),
  social: Object.freeze({ principalId: 'social', producer: 'social-service', authority: 'SOCIAL', domain: 'social' }),
  payments: Object.freeze({ principalId: 'payments', producer: 'payment-service', authority: 'ECONOMIC', domain: 'economic_finality' })
});

async function produceActivity(spec, { session } = {}) {
  const principal = PRINCIPALS[spec.principal];
  if (!principal) throw new Error('RUNTIME_PROGRESSION_PRODUCER_UNAUTHORIZED');
  const occurredAt = timestamp(spec.occurredAt);
  const [actorAffiliation, beneficiaryAffiliation] = await Promise.all([
    affiliationFor(spec.actorId, occurredAt, session),
    spec.beneficiaryId === spec.actorId ? null : affiliationFor(spec.beneficiaryId, occurredAt, session)
  ]);
  const base = {
    schemaVersion: '1.2.0', eventType: spec.eventType, activityClass: spec.activityClass,
    actorId: String(spec.actorId), beneficiaryId: String(spec.beneficiaryId), occurredAt, ingestedAt: occurredAt,
    subject: spec.subject || null, object: spec.object || null,
    affiliations: { actor: actorAffiliation, beneficiary: beneficiaryAffiliation || actorAffiliation },
    provenance: { producer: principal.producer, authority: principal.authority, ...(spec.sourceEventId ? { sourceEventId: String(spec.sourceEventId) } : {}) },
    sourceIdentity: { objectType: spec.source.objectType, objectId: String(spec.source.objectId), transition: spec.source.transition, version: String(spec.source.version) },
    evidenceRefs: [], economic: spec.economic || null, facts: {}
  };
  const identity = canonicalIdentity(base);
  const eventId = stableId(require('../contracts').stableJson(identity));
  const evidence = (spec.evidence || []).map(item => ingestRuntime({ ...item, subject: item.subject || { type: 'activity_event', id: eventId }, observedAt: timestamp(item.observedAt || occurredAt) }, principal.principalId, principal.domain, 'evidence'));
  const event = ingestRuntime({ ...base, evidenceRefs: evidence.map(item => item.evidenceId), economic: spec.economic ? { ...spec.economic, ...(spec.economic.state === 'finalized' ? { finalityEvidenceRef: evidence[0]?.evidenceId } : {}) } : null }, principal.principalId, principal.domain, 'event');
  return { event, evidence };
}

async function affiliationFor(userId, occurredAt, session) {
  const membership = await FactionMembership.findOne({ user: userId, status: 'active' }).populate('faction', 'key').session(session || null).lean();
  if (!membership?.faction) return { state: 'unaffiliated' };
  return { state: 'affiliated', factionId: String(membership.faction.key || membership.faction._id), membershipRef: String(membership._id), effectiveAt: timestamp(membership.joinedAt || membership.createdAt), source: membership.source || 'native' };
}

function timestamp(value) { return new Date(value || Date.now()).toISOString(); }

module.exports = Object.freeze({ produceActivity });
