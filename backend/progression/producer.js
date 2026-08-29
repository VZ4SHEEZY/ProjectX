'use strict';

const { canonicalEvent, deepFreeze } = require('./contracts');

const issuedRegistries = new WeakSet();
const { canonicalEvidence } = require('./evidence');

function producerRegistry(entries) {
  if (!Array.isArray(entries) || !entries.length) throw new TypeError('producer registry requires entries');
  const registry = new Map();
  for (const entry of entries) {
    bounded(entry.principalId, 'principalId'); bounded(entry.producer, 'producer');
    if (!Array.isArray(entry.domains) || !entry.domains.length || entry.domains.some(domain => typeof domain !== 'string')) throw new TypeError('producer domains must be explicit');
    if (registry.has(entry.principalId)) throw new TypeError('duplicate authenticated principal');
    registry.set(entry.principalId, deepFreeze({ producer: entry.producer, domains: [...new Set(entry.domains)].sort() }));
  }
  const authenticatedContexts = new WeakSet();
  const api = {
    authenticate(assertion) {
      if (!assertion || assertion.authenticated !== true || typeof assertion.principalId !== 'string') throw new Error('AUTHENTICATED_PRODUCER_CONTEXT_REQUIRED');
      const identity = registry.get(assertion.principalId);
      if (!identity) throw new Error('AUTHENTICATED_PRODUCER_UNKNOWN');
      return identity;
    },
    authenticatedContext(assertion, domain) {
      const identity = authorize(assertion, api, domain);
      const context = deepFreeze({ principalId: assertion.principalId, producer: identity.producer, domain });
      authenticatedContexts.add(context);
      return context;
    },
    assertContext(context, domain) {
      if (!context || !authenticatedContexts.has(context)) throw new Error('AUTHENTICATED_PRODUCER_CONTEXT_REQUIRED');
      if (context.domain !== domain) throw new Error(`PRODUCER_DOMAIN_UNAUTHORIZED:${domain}`);
      return context;
    }
  };
  const frozen = deepFreeze(api);
  issuedRegistries.add(frozen);
  return frozen;
}

function assertProducerRegistry(registry) {
  if (!registry || !issuedRegistries.has(registry)) throw new Error('TRUSTED_PRODUCER_REGISTRY_REQUIRED');
  return registry;
}

function ingestEvent(payload, assertion, registry, domain) {
  const identity = authorize(assertion, registry, domain);
  if (payload.provenance?.producer && payload.provenance.producer !== identity.producer) throw new Error('UNTRUSTED_PRODUCER_CLAIM_MISMATCH');
  return canonicalEvent({ ...payload, provenance: { ...(payload.provenance || {}), producer: identity.producer } });
}

function ingestEvidence(payload, assertion, registry, domain) {
  const identity = authorize(assertion, registry, domain);
  if (payload.producer && payload.producer !== identity.producer) throw new Error('UNTRUSTED_PRODUCER_CLAIM_MISMATCH');
  return canonicalEvidence({ ...payload, producer: identity.producer });
}

function authorize(assertion, registry, domain) {
  assertProducerRegistry(registry);
  const identity = registry.authenticate(assertion);
  if (!identity.domains.includes(domain)) throw new Error(`PRODUCER_DOMAIN_UNAUTHORIZED:${domain}`);
  return identity;
}
function bounded(value, name) { if (typeof value !== 'string' || !value || value.length > 256) throw new TypeError(`${name} must be bounded`); }

module.exports = { producerRegistry, assertProducerRegistry, ingestEvent, ingestEvidence };
