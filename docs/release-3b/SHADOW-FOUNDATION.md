# Release 3B shadow persistence foundation

Release 3B adds disabled backend storage and replay support for the Release 3A progression contracts. It does not register routes, change application imports, expose projections, or enable user-facing progression.

## Existing architecture extended

- Database and query layer: MongoDB through Mongoose.
- Migration convention: explicit CommonJS migration modules with preflight, apply, and rollback functions.
- Transaction convention: MongoDB sessions and `withTransaction` for writes spanning collections.
- Identity and time convention: Release 3A canonical string identities, canonical UTC ISO-8601 event times, and Mongoose `Date` values only for persistence/rebuild metadata.
- Existing product relationships remain authoritative: users, creators, factions, faction memberships, and tips are not modified or duplicated.

## Collections

- `progression_activity_events`: immutable canonical activity facts, including correction events.
- `progression_evidence`: immutable evidence contracts and explicit supersession references. Restricted payload fields are excluded from normal Mongoose selection.
- `progression_qualification_decisions`: immutable policy- and projection-context-bound decisions.
- `progression_correction_relationships`: immutable, indexed links from correction events to prior events.
- `progression_contribution_results`: immutable qualified personal and faction contribution results. Unaffiliated activity has no faction identity.
- `progression_policy_artifacts`: immutable policy/version artifacts needed to identify a replay exactly.
- `progression_projections`: rebuildable personal and faction checkpoints keyed by canonical projection context.

The ledger collections reject update, replacement, and deletion operations through model middleware. Duplicate canonical deliveries are idempotent; reuse of an identity with different canonical content fails closed.

## Replay

The internal persistence service reads activity events in the Release 3A canonical order (`occurredAt`, producer, event ID), restores canonical evidence, and calls the unchanged Release 3A qualification and projection functions. It can return a selected user's rebuilt personal projection and persists resulting decisions, contribution records, and separate personal/faction checkpoints. The projection context preserves cutoff, watermark, evidence/correction generations and digests, policy artifact identity, and ordering version.

Replay currently scans the shadow ledger so faction projections are rebuilt from the same complete input set as personal projections. It is an internal batch foundation, not a request-path API.

## Migration operation

`backend/migrations/004-release-3b-shadow-foundation.js` is additive and creates only Release 3B collections and indexes. Its default CLI mode is read-only preflight. `--apply` performs the migration. Rollback drops only the Release 3B collections and refuses when they contain data unless the operator explicitly supplies `--allow-data-loss`.

The migration must not be run against production as part of Release 3B development.

## Shadow isolation

`SHADOW_MODE` is fixed to `true` and `USER_FACING_PROGRESSION_ENABLED` is fixed to `false`. The service is not imported by the application server, routes, profile/feed/faction code, creator payouts, or payment processing. Hidden decision/evidence payloads are not part of any public serializer or API.
