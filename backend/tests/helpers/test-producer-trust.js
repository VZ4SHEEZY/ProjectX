'use strict';

// TEST-ONLY issuer. Tests load this before progression consumers and replace
// only their registry assertion at the CommonJS loader boundary. Production has
// no dependency or path to this issuer; fresh-process import probes bypass it.
const producerInternalPath = require.resolve('../../progression/producer-internal');
if (require.cache[producerInternalPath]) throw new Error('TEST_PRODUCER_TRUST_MUST_LOAD_BEFORE_PROGRESSION');

const issuedRegistries = new WeakSet();
function assertProducerRegistry(registry) {
  if (!registry || !issuedRegistries.has(registry)) throw new Error('TRUSTED_PRODUCER_REGISTRY_REQUIRED');
  return registry;
}
require.cache[producerInternalPath] = {
  id: producerInternalPath, filename: producerInternalPath, loaded: true,
  exports: { assertProducerRegistry }, children: [], paths: module.paths
};

function testProducerTrust(entries) {
  const identities = new Map(entries.map(entry => [entry.principalId, Object.freeze({ producer: entry.producer, domains: Object.freeze([...entry.domains]) })]));
  const credentials = new Map(entries.map(entry => [entry.principalId, Object.freeze({})]));
  const principals = new Map([...credentials].map(([principalId, credential]) => [credential, principalId]));
  const issuedContexts = new WeakSet();
  const registry = Object.freeze({
    assertContext(context, domain) {
      if (!context || !issuedContexts.has(context)) throw new Error('AUTHENTICATED_PRODUCER_CONTEXT_REQUIRED');
      if (context.domain !== domain) throw new Error(`PRODUCER_DOMAIN_UNAUTHORIZED:${domain}`);
      return context;
    }
  });
  issuedRegistries.add(registry);
  return Object.freeze({
    registry,
    authenticatedContext(principalId, domain) {
      const credential = credentials.get(principalId);
      const identity = identities.get(principals.get(credential));
      if (!credential || !identity) throw new Error('AUTHENTICATED_PRODUCER_CONTEXT_REQUIRED');
      if (!identity.domains.includes(domain)) throw new Error(`PRODUCER_DOMAIN_UNAUTHORIZED:${domain}`);
      const context = Object.freeze({ principalId, producer: identity.producer, domain });
      issuedContexts.add(context);
      return context;
    },
    authenticateUntrusted(credentialsFromCaller, domain) {
      const principalId = principals.get(credentialsFromCaller);
      if (!principalId) throw new Error('AUTHENTICATED_PRODUCER_CONTEXT_REQUIRED');
      return this.authenticatedContext(principalId, domain);
    }
  });
}

module.exports = { testProducerTrust };
