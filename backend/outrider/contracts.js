'use strict';

const crypto = require('crypto');

const CONTRACT_VERSION = '1.0.0';
const CAPABILITIES = Object.freeze({
  READ_PUBLIC_PROFILE: 'cyberdope.profile.public.read',
  READ_PUBLIC_POST: 'cyberdope.post.public.read',
  READ_PROGRESSION: 'cyberdope.progression.approved.read',
  READ_FACTION_WORLD: 'cyberdope.faction.world.read',
  RESPOND_TO_OBSERVER: 'outrider.observer.respond',
  TALK_TO_AGENT: 'outrider.agent.talk',
  CREATE_ARTIFACT: 'outrider.artifact.create',
  CREATE_EVENT: 'outrider.event.create',
  PROPOSE_POST: 'cyberdope.post.propose',
  PROPOSE_FACTION_EVENT: 'cyberdope.faction_event.propose'
});
const CROSS_GLASS = new Set([
  CAPABILITIES.READ_PUBLIC_PROFILE, CAPABILITIES.READ_PUBLIC_POST,
  CAPABILITIES.READ_PROGRESSION, CAPABILITIES.READ_FACTION_WORLD,
  CAPABILITIES.PROPOSE_POST, CAPABILITIES.PROPOSE_FACTION_EVENT
]);
const FORBIDDEN = new Set([
  'cyberdope.progression.write', 'cyberdope.role.assign',
  'cyberdope.faction.membership.write', 'cyberdope.post.write',
  'cyberdope.user.private.read', 'cyberdope.repository.access',
  'cyberdope.payment.write', 'cyberdope.config.write', 'cyberdope.deploy'
]);

function id(prefix = 'glass') { return `${prefix}_${crypto.randomUUID()}`; }
function requireString(value, field) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`INVALID_${field.toUpperCase()}`);
  return value;
}
function validateEnvelope(value, kind) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`INVALID_${kind.toUpperCase()}`);
  requireString(value.id, 'id');
  if (value.contractVersion !== CONTRACT_VERSION) throw new TypeError('UNSUPPORTED_CONTRACT_VERSION');
  requireString(value.type, 'type');
  if (!value.payload || typeof value.payload !== 'object' || Array.isArray(value.payload)) throw new TypeError('INVALID_PAYLOAD');
  return value;
}
function capabilityRequest(input) {
  if (input.contractVersion && input.contractVersion !== CONTRACT_VERSION) throw new TypeError('UNSUPPORTED_CONTRACT_VERSION');
  const value = { id: input.id || id('cap'), contractVersion: CONTRACT_VERSION, type: input.type, agentId: input.agentId, payload: input.payload || {}, requestedAt: input.requestedAt || new Date().toISOString(), correlationId: input.correlationId || id('corr') };
  validateEnvelope(value, 'capability_request');
  requireString(value.agentId, 'agent_id');
  if (!Object.values(CAPABILITIES).includes(value.type) || FORBIDDEN.has(value.type)) throw new TypeError('UNKNOWN_OR_FORBIDDEN_CAPABILITY');
  return Object.freeze(value);
}
function worldSignal(input) {
  const value = { id: input.id || id('sig'), contractVersion: CONTRACT_VERSION, type: input.type, source: input.source, subject: input.subject, visibility: input.visibility, occurredAt: input.occurredAt, payload: input.payload || {} };
  validateEnvelope(value, 'world_signal');
  requireString(value.source, 'source'); requireString(value.occurredAt, 'occurred_at');
  if (!['public', 'agent_permitted'].includes(value.visibility)) throw new TypeError('INVALID_SIGNAL_VISIBILITY');
  if (!value.subject || typeof value.subject.type !== 'string' || typeof value.subject.id !== 'string') throw new TypeError('INVALID_SIGNAL_SUBJECT');
  return Object.freeze(value);
}

module.exports = { CONTRACT_VERSION, CAPABILITIES, CROSS_GLASS, FORBIDDEN, capabilityRequest, worldSignal };
