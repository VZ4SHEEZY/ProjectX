'use strict';

const { canonicalEvent } = require('./contracts');
const { canonicalEvidence } = require('./evidence');
const { assertProducerRegistry } = require('./producer-internal');

function ingestEvent(payload, authenticatedContext, registry, domain) {
  const identity = authorize(authenticatedContext, registry, domain);
  if (payload.provenance?.producer && payload.provenance.producer !== identity.producer) throw new Error('UNTRUSTED_PRODUCER_CLAIM_MISMATCH');
  return canonicalEvent({ ...payload, provenance: { ...(payload.provenance || {}), producer: identity.producer } });
}

function ingestEvidence(payload, authenticatedContext, registry, domain) {
  const identity = authorize(authenticatedContext, registry, domain);
  if (payload.producer && payload.producer !== identity.producer) throw new Error('UNTRUSTED_PRODUCER_CLAIM_MISMATCH');
  return canonicalEvidence({ ...payload, producer: identity.producer });
}

function authorize(authenticatedContext, registry, domain) {
  assertProducerRegistry(registry);
  return registry.assertContext(authenticatedContext, domain);
}
module.exports = { assertProducerRegistry, ingestEvent, ingestEvidence };
