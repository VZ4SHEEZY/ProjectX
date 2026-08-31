# Release 3A.1 — contract-hardened event and progression architecture

## Status and boundaries

Release 3A.1 remains a design and synthetic simulation release. It does not connect controllers to the event ledger, add API routes, read production users, write MongoDB, award XP, change faction membership, change authorization, or deploy anything. All numeric weights in `simulation-v1.js` are diagnostic hypotheses, not a final or public scoring formula.

Blueprint V4 was reviewed. No standalone completed Release 3 discovery/audit artifact was found in the repository or nearby workspace. Existing Release 1/2 controls were therefore treated as mandatory audit inputs: raw content views and aggregate engagement signals remain progression-ineligible; transaction authority comes from finalized payment state; platform roles and faction membership remain separate protected domains.

Implementation classification:

- **IMPLEMENTED:** in-memory immutable event/decision contracts, duplicate collision checks, correction-graph resolution, deterministic synthetic qualification/projection, redaction boundary, typed fixture evidence, policy artifacts, and regression tests.
- **CONTRACT-DEFINED ONLY:** persistence schemas, producer natural keys, economic lifecycle, event-time faction snapshots, watermark/generation activation, qualified-history materialization, private allegiance allocation, policy registry, and public explanation mapping.
- **REQUIRES NEW INSTRUMENTATION:** trustworthy reach/audience deduplication, moderation outcomes, fraud/trust graphs, economic finality, faction-membership snapshots at source, and evidence lineage/digests.
- **FUTURE INFRASTRUCTURE:** transactional outbox, append-only database ledger, evidence store, immutable policy registry, checkpoints, atomic projection generations, replay tooling, and audited role-scoped access.
- **UNRESOLVED PRODUCT DECISION:** economic contribution owner (supporter, creator/recipient, both, or neither), level curve, caps, taxonomy details, retention, appeals, and future seasonal behavior.

## Architecture

```text
domain action -> transactional outbox (future) -> immutable raw activity_event
  -> append-only versioned qualification_decision -> qualified contribution
  -> immutable correction graph resolution
  -> personal projection -> level band + specialty ranks + unlock eligibility
  -> faction projection (members only) -> private allegiance weighting -> aggregate state (future)
```

Events record facts and evidence references, never rewards or policy interpretation. The raw contract contains no qualification state, policy version, qualification reason, or mutable policy result. Qualification produces a separate append-only decision identified by event, policy version, and evaluation generation, with a stable decision ID, result/factor, internal reason codes, evidence references, evaluation time, and immutable policy artifact digest. Projectors accept exactly one policy artifact and one decision generation. Rebuilds replace projection generations atomically; they never rewrite the event ledger.

Personal and faction projectors are separate. Every event snapshots actor and beneficiary affiliation independently as `affiliated`, `unaffiliated`, or `unknown`. An affiliated snapshot includes faction ID, event-time effective timestamp, authoritative provenance, and a membership reference when available. Normalized `FactionMembership` at event time is authoritative; legacy `User.faction` and current membership are not. Unknown and Unaffiliated both fail closed for faction contribution; neither affects personal value, and neither can default to a founding faction. A later membership change cannot alter or reconstruct an immutable snapshot.

Hidden allegiance is not a raw-event field or producer input. Any future allegiance artifact is private, derived, versioned, access-controlled strategic state, and may only allocate faction contribution that has already qualified. It cannot affect personal progression, content distribution, or become a public loyalty percentage. No allegiance formula is implemented here.

## Event identity and duplicate contract

The canonical logical identity is the stable serialization of:

`producer namespace + event type/class + immutable domain object identity + transition/version + schema version`

`eventId` is derived from that tuple and `idempotencyKey` stores its canonical serialization. The ledger enforces uniqueness on both. Byte-identical retry deliveries collapse before qualification; the same identity with different facts is an integrity collision and fails closed. Socket.IO/realtime messages are delivery notifications only and are never authoritative producers.

Natural keys for initial producers:

| Domain fact | Immutable source identity and transition |
|---|---|
| Post creation | post ID + `created` + post version |
| Comment/reply | comment ID + `created`; parent ID is a fact, not identity |
| Like/unlike | target ID + actor ID + reaction edge version + `liked`/`unliked` transition |
| Comment reaction | comment ID + actor ID + reaction edge version + reaction transition |
| Follow/unfollow | follower ID + followed ID + edge version + `followed`/`unfollowed` |
| Friendship | canonical sorted user pair + relationship version + requested/accepted/removed/blocked transition |
| Tip intent | internal tip ID + `intent-created` version; provider retries use verified provider event ID as provenance |
| Finalized tip | internal tip ID + authoritative settlement transaction/version + `finalized` |
| Subscription | subscription ID + provider lifecycle event/version + transition |
| Moderation outcome | moderation case/outcome ID + outcome version + final transition |
| Correction/reversal | target event ID + authority namespace + correction sequence/type |
| Reach evidence | subject/campaign ID + non-overlapping observation window + evidence generation/digest |

API, worker, outbox, webhook, and replay retries must reproduce the same tuple. A later domain transition must produce a new tuple and event, never overwrite the prior fact.

## Corrections, reversals, and supersession

Corrections are immutable raw facts with a target event ID, type, authority, effective time, evidence references, positive monotonic target sequence, and optional replacement/compensating relationship. Supported types are moderation reversal, reversal, refund, chargeback, supersession, and amendment. Supersession/amendment require a replacement event.

Before contribution aggregation, projection resolves only corrections visible at the pinned ledger watermark whose `effectiveAt` is at or before the pinned cutoff. Correction producer identity and authority class come from authenticated event provenance, never from the correction body. A versioned authorization matrix binds producer, authority class, permitted correction types, event-type domain, evidence authority, and authority version.

Validated corrections are ordered by authority precedence (`MODERATION` > `ECONOMIC` > `DOMAIN`), then monotonic per-authority sequence, effective time, and event ID. Equal sequences, gaps, cycles, self-correction, correction-on-correction, invalid targets, and semantic conflicts fail closed; this is deliberately not last-write-wins. Moderation reversal, refund, chargeback, reversal, chain reorganization, amendment, supersession, and compensation deactivate the target. Amendment/supersession require a compatible replacement; compensation requires a distinct compensating economic event in the explicit `reversed` state, with beneficiary-to-payer direction and a non-negative amount magnitude. The original event and decision remain immutable and auditable.

The simulator displays Level 1–100 with provisional named bands solely to make fixture differences readable. **SIMULATION ONLY / NOT PRODUCTION:** this is not a finalized mathematical curve, API guarantee, or UI contract. Specialty diagnostics cover creation, social, influence, community, exploration, creator, economy, builder/AI, and faction; thresholds, names, unlocks, and display remain unresolved.

## Qualification interface

`QualificationPolicy` requires a verified canonical policy artifact and pure `evaluate(event, context)` function. The artifact binds policy/code/config identity, detector and evidence-contract versions, taxonomy, numeric/rounding rules, runtime compatibility, and serialization. Decisions bind its digest plus the exact canonical consumed evidence-set digest, cutoff, watermark, and evaluation generation. Two evaluations with different artifact bytes or evidence cannot share a decision ID.

Expensive graph/fraud detectors should publish signed/versioned evidence consumed by policy evaluation. Cross-faction relationships are normal; only patterns with independent evidence should diminish. High volume alone is insufficient to label abuse. Confirmed economic activity is bounded and logarithmic, with breadth represented separately from amount.

Policy evaluation receives referenced evidence and a deterministic summary of earlier *qualified* decisions only. It never receives unrestricted prior raw events. Invalid duplicates, rejected facts, and facts made ineffective by the correction graph must be excluded from history materialization before a stateful production policy runs.

## Evidence contracts

Reach, moderation, fraud/trust, and economic-finality evidence use a typed, versioned envelope with stable subject, producer, generation, confidence, lineage, digest, supersession reference, privacy class, and retention class. Reach additionally requires a half-open observation window, deduplication method, pseudonymous/count-only audience aggregate, unique people/factions, same-faction, cross-faction, Unaffiliated, unknown/ineligible buckets, and source channel. Actor/beneficiary faction context is referenced from immutable event snapshots. Overlapping windows for the same subject are not independently additive; they must be deduplicated or superseded.

These contracts are ports for future instrumentation, not assertions that ProjectX currently has trustworthy reach, moderation, Sybil, relationship-graph, trust, or economic detectors. Evidence IDs are derived from immutable canonical material and caller IDs must match exactly. Evidence supersession is append-only, explicit, same-subject/type/producer/version, generation-ordered, cycle-free, and evaluated at the pinned cutoff. Reach overlap rejection is mandatory during qualification.

### Sensitive-data boundary

Evidence envelopes, decision reason codes, decision signals, correction authority material, and supersession lineage are **INTERNAL RESTRICTED**. They may contain only bounded references, digests, categorical outputs, and approved numeric/boolean detector fields. They must not copy full payment details, raw relationship graphs, location history, moderation content, private faction affinity, identity-sensitive payloads, wallet/account identifiers, or free-form detector messages. Public projections accept only the explicit `CROSS_COMMUNITY_REACH` and `ACTIVITY_NOT_QUALIFIED` categories; unknown or policy-supplied strings fail closed.

Every in-memory projection generation returns reproducibility metadata: ledger cutoff, watermark, correction-graph digest, effective-evidence-set digest, policy-artifact digest, evaluation generation, and canonical ordering version. Release 3A.2 defines and tests this contract only; it does not persist projections.

## Projection and privacy

Every projection row is keyed by beneficiary plus projection generation and policy version. Qualification `reasonCodes` and `signals` are internal-only. Public views may expose only explicitly mapped `publicExplanationCategories`, level, band, named specialties, and achievements. They must not expose exact weights, hidden allegiance, fraud features, linked-account evidence, or individual faction-intelligence details. Faction contribution is qualified strategic value, never raw likes, spending, member count, or personal XP.

## Time, cutoff, and generation contract

- `occurredAt` is the authoritative domain-effective time; `ingestedAt` is first durable ledger acceptance. Both are canonical UTC timestamps. Producer authority decides whether a historical timestamp is admissible; clock-skew limits are producer-versioned policy, never wall-clock guesses during replay.
- Total event order is `(occurredAt, producer namespace, eventId)`. Correction order is `(targetEventId, sequence, effectiveAt, eventId)`.
- A projection generation records an immutable ledger watermark/cutoff, policy artifact digest, evidence generation/digests, and evaluation generation. Only records at or below that cutoff participate.
- A late arrival below an already closed watermark creates a new generation under an explicit `exclude`, `reopen`, or `next-window` policy; it never silently mutates an active generation. Historical imports require their own producer namespace and import manifest.
- Correction `effectiveAt` controls the first generation/window in which the correction is effective. Future seasonal assignment uses occurrence time plus a versioned season-boundary artifact. Reopening creates a new generation. Seasons themselves are not implemented.

## Economic lifecycle

The immutable lifecycle can represent intent, pending, confirmed, finalized, failed, refund, chargeback, chain reorganization, and reversal facts. Only a finalized fact from an authoritative producer with an economic-finality evidence reference can qualify. Pending/failed facts contribute zero. Refund, chargeback, reorganization, or reversal facts compensate/deactivate earlier eligible contribution through the correction graph without deleting the original settlement fact. No production payment integration exists. Whether eligible economic contribution belongs to the supporter, creator/recipient, both, or neither is deliberately unresolved; the simulator's displayed recipient allocation is a test hypothesis and must not be inferred as policy.

## Policy reproducibility

The immutable policy artifact contains policy ID/version, code and configuration digests, detector versions, evidence-contract versions, taxonomy version, numeric and rounding rules, runtime compatibility, canonical serialization, and the resulting artifact digest. Replays must pin that artifact, evidence digests, generation, and ledger cutoff; mutable environment variables or current source constants are not historical inputs.

`same immutable ledger + same immutable evidence + same policy artifact + same generation/cutoff = same projection`.

Extension ports are reserved for privacy-preserving location evidence, builder/agent adoption, seasons, prestige, leadership eligibility, faction lineage, government, diplomacy, battles, territory, and intelligence. These systems are not implemented. Government remains a prerequisite for future war capability.

## Safe persistence and migration plan (proposed only)

No database migration is included in 3A. For 3B, add new collections rather than modifying `User`, `FactionMembership`, or role records:

- `activity_events`: immutable documents; unique `eventId`, unique canonical `idempotencyKey`, indexes on occurrence time, actor, beneficiary, type, affiliation snapshots, and correction target. Application and database roles deny update/delete.
- `qualification_decisions`: append-only decisions uniquely keyed by `decisionId` and `(eventId,policyVersion,evaluationGeneration)` with result, factor, internal reason codes, evidence references, timestamp, and artifact digest.
- `personal_progression_projections`: rebuildable generation keyed by `(beneficiaryId,policyVersion,generation)`.
- `faction_contribution_projections`: private rebuildable generation keyed by faction/member/policy/generation with stricter access controls.
- `projection_checkpoints`: consumer offsets and atomic active-generation pointer.
- `policy_registry`: immutable policy artifact and schema/config/code digests, runtime version, qualification/contribution implementation IDs, effective window, evidence-contract versions, activation/approval records, and rollback reference. Historical replay never reads mutable environment variables or current constants in place of this artifact.

Rollout: create empty collections and indexes; deploy a disabled shadow writer behind an allowlist; verify idempotency and outbox recovery; backfill only explicitly approved non-production fixtures; run shadow qualification; compare generations; require security/product review before any production consumer or user-visible projection is enabled. Never derive historical faction snapshots from current membership.

## Determinism and simulator

The harness uses fixed timestamps, stable SHA-256-derived IDs, synthetic identities, stable sorting, pure policies, and no network/database calls. It covers all 18 requested personas across different volumes and time spacing. `npm run simulate:progression` renders a human-readable report. `--policy=v2` replays the same immutable ledger with stronger repeat decay, demonstrating policy rebuilds.

## Future event producers

Controllers should not synchronously award progression. In 3B, a successful domain transaction writes an outbox record in the same database transaction where supported. A publisher maps it to the canonical schema. Provider webhooks emit final or reversal economic events only after authoritative verification. Deletes/moderation emit new correction events; they do not mutate the original activity event.
