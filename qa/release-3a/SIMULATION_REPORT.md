# Release 3A.1 deterministic simulation report

Policy: `sim-2026-08-v1`

Synthetic immutable events: 584. No database or production user was read or mutated.

| Persona | Level | Personal | Faction | Cross-faction | Decisions | Why |
|---|---:|---:|---:|---:|---|---|
| normal casual user | 2 | 24.06 | 10.37 | 1.58 | qualified:5 | QUALIFIED |
| highly active legitimate user | 3 | 71.88 | 27.75 | 3 | qualified:8, diminished:37 | QUALIFIED, REPEATED_ACTION_DIMINISHING |
| original creator | 4 | 98.07 | 33.17 | 1.58 | qualified:8, diminished:4 | QUALIFIED, REPEATED_ACTION_DIMINISHING |
| viral creator | 5 | 130.39 | 90.3 | 16.47 | qualified:4 | QUALIFIED |
| viral cross-faction creator | 5 | 146.56 | 229.52 | 65.87 | qualified:4 | QUALIFIED |
| same-faction engagement farmer | 1 | 1.77 | 0.54 | 0 | diminished:80 | RECIPROCAL_RING_DIMINISHING, REPEATED_ACTION_DIMINISHING, SAME_FACTION_RING_DIMINISHING |
| spam poster | 1 | 0.83 | 0.26 | 0 | diminished:100 | LOW_VALUE_VOLUME_DIMINISHING, REPEATED_ACTION_DIMINISHING, SUSPICIOUS_VELOCITY |
| follow/unfollow farmer | 1 | 0.71 | 0.27 | 0.03 | diminished:90 | LOW_VALUE_VOLUME_DIMINISHING, RECIPROCAL_RING_DIMINISHING, REPEATED_ACTION_DIMINISHING |
| social/community-focused user | 3 | 70.31 | 37.08 | 4 | qualified:8, diminished:17 | QUALIFIED, REPEATED_ACTION_DIMINISHING |
| creator with many independent legitimate supporters | 4 | 100.62 | 53.18 | 5 | qualified:8, diminished:12 | QUALIFIED, REPEATED_ACTION_DIMINISHING |
| creator with one very large legitimate supporter | 2 | 12.69 | 5.78 | 1 | qualified:1 | QUALIFIED |
| wealthy spender attempting to purchase personal progression | 1 | 0 | 0 | 0 | none |  |
| suspected circular tip network | 1 | 0 | 0 | 0 | rejected:12 | CIRCULAR_ECONOMIC_ACTIVITY |
| cross-faction social butterfly | 4 | 76.33 | 54.12 | 8.65 | qualified:8, diminished:22 | QUALIFIED, REPEATED_ACTION_DIMINISHING |
| strongly faction-oriented user | 3 | 62.15 | 21.97 | 1 | qualified:8, diminished:22 | QUALIFIED, REPEATED_ACTION_DIMINISHING |
| Unaffiliated power user | 4 | 104.47 | 0 | 8 | qualified:8, diminished:42 | QUALIFIED, REPEATED_ACTION_DIMINISHING |
| future AI/bot builder persona | 5 | 182.25 | 89.79 | 18 | qualified:8, diminished:7 | QUALIFIED, REPEATED_ACTION_DIMINISHING |
| suspicious Sybil/engagement-ring cluster | 1 | 0 | 0 | 0 | rejected:60 | HIGH_SYBIL_CONFIDENCE |

## Interpretation

- SIMULATION ONLY / NOT PRODUCTION: scores, named bands, and thresholds are diagnostics, not a finalized mathematical curve or promised balance.
- Economic rows currently display the recipient-allocation hypothesis solely as a simulator diagnostic. Whether credit belongs to supporter, recipient, both, or neither is unresolved.
- Qualification reason codes explain outcomes without revealing private allegiance inputs or a future scoring formula.
- High-volume legitimate activity can diminish through neutral repeat caps without being labeled abuse.
- Unaffiliated activity receives personal progression and no faction projection.
- Policy V2 exists only to verify that the same raw ledger can be replayed into new projections.

## Scenario outcomes

- Wealthy-spender attempt: the supporter receives no personal credit under the displayed recipient-allocation hypothesis; the synthetic recipient receives 13.72. This does not decide production ownership.
- One large legitimate supporter: the creator receives 12.69 simulated contribution.
- Many independent legitimate supporters: the creator receives 100.62 simulated contribution. Breadth is represented by distinct finalized events, not copied onto each payment.

## Known limitations

- Reach totals are distributed into disjoint per-event fixture windows; they are not copied wholesale onto every event. Production still requires deduplicated reach instrumentation.
- Trust confidence of 1 is neutral in ordinary fixtures. Adverse trust states require explicit synthetic evidence.
- The simulator does not decide supporter-versus-recipient economic credit, validate upper-level pacing, or implement seasons, allegiance, detectors, payments, or production progression.
- Internal reason codes appear in this restricted QA artifact for auditability; public projections expose only public-safe categories.
