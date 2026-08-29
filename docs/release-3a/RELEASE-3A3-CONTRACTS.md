# Release 3A.3 replay identity and authority closure

This release remains an in-memory contract/simulator foundation. It creates no production persistence, progression, faction power, hidden allegiance, or user changes.

## Evidence field classification

- **Identity-bound immutable:** `type`, `contractVersion`, `subject`, authenticated `producer`, canonical numeric `generation`, `observedAt`, `confidence`, sorted `lineage`, `supersedesEvidenceId`, `privacyClassification`, `retentionClass`, and the complete typed `body`.
- **Non-identity derived:** `evidenceDigest` (SHA-256 over the complete identity material) and `evidenceId` (the canonical shortened identity derived from that digest).
- **Forbidden/mutable outside evidence:** unknown envelope/body properties, free-form detector output, raw payment details or credentials, raw moderation content, raw graphs/location history, authentication material, and private faction affinity/allegiance.

Caller-supplied derived values must exactly match recomputation. Duplicate IDs are accepted only for canonically identical envelopes; any differing immutable field fails closed.

## Generations and replay context

All generations are canonical unsigned decimal strings in the range `1` through 16 decimal digits. Leading zeroes, labels, numbers, signs, and decimal values are rejected rather than reinterpreted. Ordering uses integer semantics.

`ProjectionContext` is a closed immutable contract binding ledger cutoff, watermark, evaluation/evidence/correction generations, policy ID/version and verified artifact digest, effective evidence-context digest, correction-graph digest, and ordering version. Its SHA-256 `projectionContextId` is embedded in each `QualificationDecision`; projection recomputes the context and rejects decisions from any other context.

## Artifact and producer authority boundaries

Policy code content and canonical configuration content are hashed locally. Supplied code/config/aggregate digests are assertions checked against those bytes, never proof by themselves. External artifact references require immutable-reference syntax and resolver-returned bytes whose digest is verified before use.

Producer names in payloads are untrusted claims. Authoritative ingestion takes an authenticated principal context, maps it to a producer in an explicit registry, checks domain ownership, and rejects payload/identity mismatches. This contract deliberately does not choose production credential infrastructure.

Every qualifying event type has an explicit evidence-type/authority allowlist in its verified policy artifact. Unknown event types and unsupported evidence fail closed. Correction authorization additionally verifies correction-specific body outcome, exact target event and object/transaction relationship, producer-matching authority reference, and required replacement/version or chain facts. Correction evidence must belong to the ProjectionContext evidence generation; a well-formed envelope from another generation is rejected.

## Sensitive-data boundary

Persistence-facing contracts accept bounded identifiers, references, digests, categorical values, and closed structured metadata only. Policy metadata is depth/node/array/string bounded and rejects credential, raw-content, relationship/location, and private-allegiance key classes. Restricted detector signals and qualification reasons remain `INTERNAL RESTRICTED`; public projection output remains allowlisted. These contracts must not be used as generic sensitive-data containers.
