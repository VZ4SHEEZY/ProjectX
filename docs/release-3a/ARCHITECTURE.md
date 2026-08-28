# Release 3A — event and progression architecture

## Status and boundaries

Release 3A is a design and synthetic simulation release. It does not connect controllers to the event ledger, add API routes, read production users, write MongoDB, award XP, change faction membership, change authorization, or deploy anything. All numeric weights in `simulation-v1.js` are diagnostic hypotheses, not a final or public scoring formula.

Blueprint V4 was reviewed. No standalone completed Release 3 discovery/audit artifact was found in the repository or nearby workspace. Existing Release 1/2 controls were therefore treated as mandatory audit inputs: raw content views and aggregate engagement signals remain progression-ineligible; transaction authority comes from finalized payment state; platform roles and faction membership remain separate protected domains.

## Architecture

```text
domain action -> transactional outbox (future) -> immutable activity_event
  -> versioned qualification decision -> qualified contribution
  -> personal projection -> level band + specialty ranks + unlock eligibility
  -> faction projection (members only) -> private allegiance weighting -> aggregate state (future)
```

Events record claims about actions, not rewards. A consumer validates and appends a canonical event with a unique idempotency key. Qualification produces a separate, versioned decision containing state, factor, internal reason codes, and evidence references. Projectors consume raw events plus a chosen decision set. Rebuilds replace projection generations atomically; they never rewrite the event ledger.

Personal and faction projectors are separate. Personal progression is calculated before and independently of faction projection. `factionAtEvent: null` never changes personal value and never assigns a faction. Hidden allegiance is a private faction allocation input only and must never suppress legitimate personal progression or Discover distribution.

The visible primary projection is Level 1–100 with Initiation, Established, Influential, Elite, Legendary, and Apex bands. Specialty projections cover creation, social, influence, community, exploration, creator, economy, builder/AI, and faction; production UI should turn these into named ranks/unlocks rather than nine dominant counters. Level thresholds and specialty rank names remain configurable.

## Qualification interface

`QualificationPolicy` requires a stable `version` and a pure `evaluate(event, context)` function. It returns `qualified`, `diminished`, `quarantined`, `rejected`, or `reversed`, a bounded factor, and internal reason codes. The simulator implements hooks for duplicates, self-interaction, moderation, trust, velocity, repetition, reciprocal/same-faction rings, Sybil confidence, disclosed bots, linked accounts/wallets, circular transfers, payment finality, refunds, quarantine, and replay. These are interfaces and illustrative rules—not claims that production detectors exist.

Expensive graph/fraud detectors should publish signed/versioned evidence consumed by policy evaluation. Cross-faction relationships are normal; only patterns with independent evidence should diminish. High volume alone is insufficient to label abuse. Confirmed economic activity is bounded and logarithmic, with breadth represented separately from amount.

## Projection and privacy

Every projection row is keyed by beneficiary plus projection generation and policy version. Public views may expose level, band, named specialties, achievements, and summarized reason categories. They must not expose exact weights, hidden allegiance, fraud features, linked-account evidence, or individual faction-intelligence details. Faction contribution is qualified strategic value, never raw likes, spending, member count, or personal XP.

Extension ports are reserved for privacy-preserving location evidence, builder/agent adoption, seasons, prestige, leadership eligibility, faction lineage, government, diplomacy, battles, territory, and intelligence. These systems are not implemented. Government remains a prerequisite for future war capability.

## Safe persistence and migration plan (proposed only)

No database migration is included in 3A. For 3B, add new collections rather than modifying `User`, `FactionMembership`, or role records:

- `activity_events`: immutable documents; unique `eventId`, unique `(provenance.service,idempotencyKey)`, indexes on occurrence time, actor, beneficiary, type, faction snapshot, correction reference. Application and database roles deny update/delete.
- `qualification_decisions`: append-only decisions keyed by `(eventId,policyVersion,evaluationGeneration)` with state, reason codes, factor, evidence references, and timestamps.
- `personal_progression_projections`: rebuildable generation keyed by `(beneficiaryId,policyVersion,generation)`.
- `faction_contribution_projections`: private rebuildable generation keyed by faction/member/policy/generation with stricter access controls.
- `projection_checkpoints`: consumer offsets and atomic active-generation pointer.
- `policy_registry`: immutable policy metadata, code/config digest, activation status, approver, and rollback reference.

Rollout: create empty collections and indexes; deploy a disabled shadow writer behind an allowlist; verify idempotency and outbox recovery; backfill only explicitly approved non-production fixtures; run shadow qualification; compare generations; require security/product review before any production consumer or user-visible projection is enabled. Never derive historical faction snapshots from current membership.

## Determinism and simulator

The harness uses fixed timestamps, stable SHA-256-derived IDs, synthetic identities, stable sorting, pure policies, and no network/database calls. It covers all 18 requested personas across different volumes and time spacing. `npm run simulate:progression` renders a human-readable report. `--policy=v2` replays the same immutable ledger with stronger repeat decay, demonstrating policy rebuilds.

## Future event producers

Controllers should not synchronously award progression. In 3B, a successful domain transaction writes an outbox record in the same database transaction where supported. A publisher maps it to the canonical schema. Provider webhooks emit final or reversal economic events only after authoritative verification. Deletes/moderation emit new correction events; they do not mutate the original activity event.
