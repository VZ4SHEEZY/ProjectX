# Release 3A.6 producer root of trust

Production progression is a consumer of producer authority, never its issuer. The single production authority is composed in the closure of `producer-internal.js` from a fixed principal-to-producer/domain allowlist. Neither the authority, its registry, its context issuer, the allowlist, nor an authentication callback is exported. The only production export is `assertProducerRegistry`, which can validate an already-held capability but cannot mint one.

Authentication is deliberately fail-closed in 3A.6. The non-exported `authenticateServerIdentityFor3B` adapter is the future connection point for credentials, sessions, or service identity. Release 3B must implement that adapter inside the server-owned composition; it must not add dependency injection to progression entry points or export registry/context issuance.

Tests use `backend/tests/helpers/test-producer-trust.js`. Before loading progression consumers, this test-only module installs a test-owned registry assertion in the CommonJS test loader cache and issues independently branded fixture contexts. No production module imports it. Fresh-process tests require the real production paths without the test loader override and reproduce the Release 3A.5 direct-import attack.
