'use strict';

const { deepFreeze } = require('./contracts');

const issuedRegistries = new WeakSet();

function createProducerTrustBoundary(entries, authenticatePrincipal) {
  if (!Array.isArray(entries) || !entries.length) throw new TypeError('producer registry requires entries');
  if (typeof authenticatePrincipal !== 'function') throw new TypeError('producer trust boundary requires a private authenticator');
  const identities = new Map();
  for (const entry of entries) {
    bounded(entry.principalId, 'principalId'); bounded(entry.producer, 'producer');
    if (!Array.isArray(entry.domains) || !entry.domains.length || entry.domains.some(domain => typeof domain !== 'string')) throw new TypeError('producer domains must be explicit');
    if (identities.has(entry.principalId)) throw new TypeError('duplicate authenticated principal');
    identities.set(entry.principalId, deepFreeze({ producer: entry.producer, domains: [...new Set(entry.domains)].sort() }));
  }
  const authenticatedContexts = new WeakSet();
  const registry = deepFreeze({
    assertContext(context, domain) {
      if (!context || !authenticatedContexts.has(context)) throw new Error('AUTHENTICATED_PRODUCER_CONTEXT_REQUIRED');
      if (context.domain !== domain) throw new Error(`PRODUCER_DOMAIN_UNAUTHORIZED:${domain}`);
      return context;
    }
  });
  issuedRegistries.add(registry);
  return deepFreeze({
    registry,
    authenticate(credentials, domain) {
      const principalId = authenticatePrincipal(credentials);
      if (typeof principalId !== 'string') throw new Error('AUTHENTICATED_PRODUCER_CONTEXT_REQUIRED');
      const identity = identities.get(principalId);
      if (!identity) throw new Error('AUTHENTICATED_PRODUCER_UNKNOWN');
      if (!identity.domains.includes(domain)) throw new Error(`PRODUCER_DOMAIN_UNAUTHORIZED:${domain}`);
      const context = deepFreeze({ principalId, producer: identity.producer, domain });
      authenticatedContexts.add(context);
      return context;
    }
  });
}

function assertProducerRegistry(registry) {
  if (!registry || !issuedRegistries.has(registry)) throw new Error('TRUSTED_PRODUCER_REGISTRY_REQUIRED');
  return registry;
}

function bounded(value, name) { if (typeof value !== 'string' || !value || value.length > 256) throw new TypeError(`${name} must be bounded`); }

module.exports = { createProducerTrustBoundary, assertProducerRegistry };
