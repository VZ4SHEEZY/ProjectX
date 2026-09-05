'use strict';

const { deepFreeze } = require('./contracts');

// Composed once in this closure. No export can add principals, replace
// authentication, issue a registry, or mint a context.
const issuedRegistries = new WeakSet();
const PRODUCTION_PRINCIPALS = deepFreeze([
  { principalId: 'payments', producer: 'payment-service', domains: ['correction', 'economic_finality'] },
  { principalId: 'moderation', producer: 'moderation-service', domains: ['correction', 'moderation'] },
  { principalId: 'social', producer: 'social-service', domains: ['social'] },
  { principalId: 'user_api', producer: 'user-api', domains: ['user'] }
]);

function composeClosedServerAuthority() {
  const identities = new Map(PRODUCTION_PRINCIPALS.map(entry => [entry.principalId, entry]));
  const issuedContexts = new WeakSet();
  const registry = deepFreeze({
    assertContext(context, domain) {
      if (!context || !issuedContexts.has(context)) throw new Error('AUTHENTICATED_PRODUCER_CONTEXT_REQUIRED');
      if (context.domain !== domain) throw new Error(`PRODUCER_DOMAIN_UNAUTHORIZED:${domain}`);
      return context;
    }
  });
  issuedRegistries.add(registry);

  // Release 3B connects this server-owned adapter to verified credentials,
  // sessions, or service identity. It and the authority object are not exported.
  function authenticateServerIdentity(serverIdentity, domain) {
    const principalId = authenticateServerIdentityFor3B(serverIdentity);
    const identity = identities.get(principalId);
    if (!identity) throw new Error('AUTHENTICATED_PRODUCER_UNKNOWN');
    if (!identity.domains.includes(domain)) throw new Error(`PRODUCER_DOMAIN_UNAUTHORIZED:${domain}`);
    const context = deepFreeze({ principalId, producer: identity.producer, domain });
    issuedContexts.add(context);
    return context;
  }
  return deepFreeze({ registry, authenticateServerIdentity });
}

function authenticateServerIdentityFor3B() {
  throw new Error('PRODUCER_AUTHENTICATION_NOT_CONFIGURED');
}

// Keep the single closed composition alive without exposing it to application
// or progression callers.
const serverProducerAuthority = composeClosedServerAuthority();
void serverProducerAuthority;

function assertProducerRegistry(registry) {
  if (!registry || !issuedRegistries.has(registry)) throw new Error('TRUSTED_PRODUCER_REGISTRY_REQUIRED');
  return registry;
}

// Non-enumerable, server-internal adapter for Release 3C. It exposes neither a
// registry nor an authenticated context and accepts only the closed principals
// composed above. Application routes cannot supply producer or authority claims.
function ingestRuntime(payload, principalId, domain, kind) {
  const identity = PRODUCTION_PRINCIPALS.find(entry => entry.principalId === principalId);
  if (!identity || !identity.domains.includes(domain)) throw new Error(`PRODUCER_DOMAIN_UNAUTHORIZED:${domain}`);
  if (kind === 'event') {
    const { canonicalEvent } = require('./contracts');
    if (payload.provenance?.producer && payload.provenance.producer !== identity.producer) throw new Error('UNTRUSTED_PRODUCER_CLAIM_MISMATCH');
    return canonicalEvent({ ...payload, provenance: { ...(payload.provenance || {}), producer: identity.producer } });
  }
  const { canonicalEvidence } = require('./evidence');
  if (payload.producer && payload.producer !== identity.producer) throw new Error('UNTRUSTED_PRODUCER_CLAIM_MISMATCH');
  return canonicalEvidence({ ...payload, producer: identity.producer });
}

const exported = { assertProducerRegistry };
Object.defineProperty(exported, 'ingestRuntime', { value: ingestRuntime, enumerable: false });
module.exports = Object.freeze(exported);
