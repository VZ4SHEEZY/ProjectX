# Release 3A.6 producer root of trust

Production progression is a consumer of producer authority, never its issuer. The single production authority is composed in the closure of `producer-internal.js` from a fixed principal-to-producer/domain allowlist. Neither the authority, its registry, its context issuer, the allowlist, nor an authentication callback is exported. The only production export is `assertProducerRegistry`, which can validate an already-held capability but cannot mint one.

Authentication is deliberately fail-closed in 3A.6. The non-exported `authenticateServerIdentityFor3B` adapter is the future connection point for credentials, sessions, or service identity. Release 3B must implement that adapter inside the server-owned composition; it must not add dependency injection to progression entry points or export registry/context issuance.

## Test fixture history

The original Release 3A.6 tests used `backend/tests/helpers/test-producer-trust.js` to install a test-owned registry assertion through Node's CommonJS `require.cache` before loading progression consumers. That historical setup kept test authority out of the production API, but its process-wide cache replacement made isolation depend on module loading state. Release 3A.7 superseded that testing implementation without changing production progression code.

## Release 3A.7 test fixture isolation

The Release 3A.7 helper does not modify `require.cache`, replace production modules or exports, or modify Node's process-wide module loader. Instead, it creates private, uncached CommonJS `Module` instances for selected progression components. Test-owned dependencies are supplied locally only to those private instances, producing an isolated test module graph with independently branded fixture contexts and registry authority.

Normal application imports continue to use the normal production module graph. Loading or using the helper leaves the identity and exports of the production `producer-internal.js`, `producer.js`, and `projection.js` modules unchanged. Test execution is independent of whether the helper or production modules are imported first, and fixture-created registries are not accepted by the real production authority. No production module imports the helper.
