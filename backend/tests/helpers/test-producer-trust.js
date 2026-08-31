'use strict';

const { createProducerTrustBoundary } = require('../../progression/producer-internal');

// TEST-ONLY issuer. Production code must supply an authenticator backed by its
// already-authenticated server request/worker identity.
function testProducerTrust(entries) {
  const credentials = new Map(entries.map(entry => [entry.principalId, Object.freeze({})]));
  const principals = new Map([...credentials].map(([principalId, credential]) => [credential, principalId]));
  const boundary = createProducerTrustBoundary(entries, credential => principals.get(credential));
  return Object.freeze({
    registry: boundary.registry,
    authenticatedContext(principalId, domain) {
      return boundary.authenticate(credentials.get(principalId), domain);
    },
    authenticateUntrusted(credentialsFromCaller, domain) {
      return boundary.authenticate(credentialsFromCaller, domain);
    }
  });
}

module.exports = { testProducerTrust };
