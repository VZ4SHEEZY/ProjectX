# Release 3A threat model and unresolved decisions

## Threats and controls

- Replay/duplicate delivery: stable producer idempotency keys, unique indexes, deterministic rejection, consumer checkpoints.
- Self-dealing and related accounts: identity/link evidence hooks; never trust actor-supplied relationship flags.
- Spam and low-value volume: outcome-sensitive qualification, time windows, repeat decay, quarantine; high volume alone is not abuse.
- Engagement rings and circular reciprocity: graph evidence, unique-person/faction diversity, rapid repeated-pair decay. Normal cross-faction friendships are not violations.
- Sybil clusters and bots: confidence evidence, quarantine/appeal path, explicit bot provenance. Legitimate builder adoption is supported.
- Economic manipulation: authoritative finality, linked-wallet/self-payment checks, circular-flow analysis, logarithmic bands, rolling caps, reversal events. Dollars never map directly to XP.
- Moderation/report abuse: reports alone do not produce Influence; verified moderation outcomes can reverse prior qualification. Malicious reporting cannot earn progression.
- Policy tampering: immutable registry entries, code/config digest, dual approval, reproducible replay, generation comparison, rollback.
- Insider/privacy risk: hidden allegiance and fraud evidence are private, role-scoped, audited, and omitted from public APIs/reports.
- Event forgery/order drift: authenticated producers, schema registry, provenance/trace IDs, occurrence plus ingestion timestamps, deterministic tie-breaking.
- Deletion/privacy conflicts: retain the minimum pseudonymous ledger needed for integrity; define erasure/anonymization with legal counsel without rewriting economic audit facts improperly.

The simulator has intentionally limited detectors. It models extension points; it does not establish that device linkage, wallet graphs, robust moderation confidence, bot attribution, or ring detection currently exists.

## Unresolved product decisions

- Exact Level 1–100 curve, seasonal treatment, decay, and Prestige transition.
- Specialty rank names, thresholds, unlock catalog, and whether specialty values are ever shown numerically.
- Event taxonomy ownership, retention, correction semantics, and late-event windows.
- Qualification appeal process, quarantine duration, confidence thresholds, and human-review authority.
- Which outcomes represent quality for each media/action type, including legitimate dislikes and controversy.
- Treatment of deleted content versus policy-violating content and retroactive reversals.
- Unique-person/faction windows, repeat decay, audience-size normalization, and new-creator fairness.
- Economic caps, supported value bands, subscription retention windows, currency conversion, and creator-versus-supporter credit.
- Private allegiance inputs, allocation limits, governance access, retention, and explainability requirements.
- Faction contribution seasons, inactivity handling, faction changes, lineage, and event-time snapshot rules.
- Bot/AI disclosure policy and how builder adoption is independently verified.
- Privacy/consent model for location and related-account evidence.
- Unlock eligibility review for high-impact capabilities and separation from platform authorization.

## Recommended Release 3B

Approve the canonical taxonomy and unresolved data-retention decisions; implement the ledger, policy registry, transactional outbox, and rebuildable projection stores behind disabled flags; wire only a small non-economic producer set in shadow mode; add signed evidence contracts and operational replay tooling; run staging load/idempotency/failure-recovery tests; complete privacy/security review. Keep user-visible levels, faction power, allegiance effects, economic progression, governments, wars, territory, and production awards disabled.
