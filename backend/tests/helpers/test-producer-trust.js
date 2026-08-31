'use strict';

// TEST-ONLY issuer and progression module graph. Each selected production
// consumer is evaluated in a private Module instance with explicit, local
// dependency overrides. Nothing is installed in Node's process-wide cache and
// normal production imports always resolve to the real producer authority.
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');

const progressionRoot = path.resolve(__dirname, '../../progression');
const issuedRegistries = new WeakSet();

function assertTestProducerRegistry(registry) {
  if (!registry || !issuedRegistries.has(registry)) throw new Error('TRUSTED_PRODUCER_REGISTRY_REQUIRED');
  return registry;
}

function loadPrivateModule(filename, overrides = {}) {
  const instance = new Module(`${filename}#test-producer-trust`, module);
  instance.filename = filename;
  instance.paths = Module._nodeModulePaths(path.dirname(filename));
  const normalRequire = Module.createRequire(filename);
  instance.require = request => Object.hasOwn(overrides, request) ? overrides[request] : normalRequire(request);
  instance._compile(fs.readFileSync(filename, 'utf8'), filename);
  return instance.exports;
}

function createTestProgression() {
  const producer = loadPrivateModule(path.join(progressionRoot, 'producer.js'), {
    './producer-internal': Object.freeze({ assertProducerRegistry: assertTestProducerRegistry })
  });
  const projection = loadPrivateModule(path.join(progressionRoot, 'projection.js'), { './producer': producer });
  const qualification = loadPrivateModule(path.join(progressionRoot, 'qualification.js'), { './projection': projection });
  return Object.freeze({ producer, projection, qualification });
}

const testProgression = createTestProgression();

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

module.exports = { testProducerTrust, testProgression };
