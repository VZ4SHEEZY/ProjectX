# Release 3A.1 deterministic simulation report

Policy: `sim-2026-08-v1`

Synthetic immutable events: 584. No database or production user was read or mutated.

| Persona | Level | Personal | Faction | Cross-faction | Decisions | Why |
|---|---:|---:|---:|---:|---|---|
| normal casual user | 3 | 39.17 | 38.74 | 14.26 | diminished:5 | TRUST_ADJUSTED |
| highly active legitimate user | 6 | 202.76 | 323.58 | 139.64 | diminished:45 | DIVERSE_CROSS_FACTION_REACH, REPEATED_ACTION_DIMINISHING, TRUST_ADJUSTED |
| original creator | 5 | 143.89 | 110.37 | 35.32 | diminished:12 | REPEATED_ACTION_DIMINISHING, TRUST_ADJUSTED |
| viral creator | 5 | 141.71 | 194.47 | 58.37 | diminished:4 | DIVERSE_CROSS_FACTION_REACH, TRUST_ADJUSTED |
| viral cross-faction creator | 5 | 162.24 | 415.65 | 136.28 | diminished:4 | DIVERSE_CROSS_FACTION_REACH, TRUST_ADJUSTED |
| same-faction engagement farmer | 1 | 3.13 | 0.96 | 0 | diminished:80 | RECIPROCAL_RING_DIMINISHING, REPEATED_ACTION_DIMINISHING, SAME_FACTION_RING_DIMINISHING |
| spam poster | 1 | 0.89 | 0.27 | 0 | diminished:100 | LOW_VALUE_VOLUME_DIMINISHING, REPEATED_ACTION_DIMINISHING, SUSPICIOUS_VELOCITY |
| follow/unfollow farmer | 1 | 1.82 | 2.7 | 1.14 | diminished:90 | LOW_VALUE_VOLUME_DIMINISHING, RECIPROCAL_RING_DIMINISHING, REPEATED_ACTION_DIMINISHING |
| social/community-focused user | 5 | 181 | 338.95 | 112.6 | diminished:25 | DIVERSE_CROSS_FACTION_REACH, REPEATED_ACTION_DIMINISHING, TRUST_ADJUSTED |
| creator with many small genuine supporters | 6 | 273.62 | 393.8 | 114.69 | diminished:20 | DIVERSE_CROSS_FACTION_REACH, REPEATED_ACTION_DIMINISHING, TRUST_ADJUSTED |
| creator with one huge supporter | 2 | 11.42 | 5.2 | 0.9 | diminished:1 | TRUST_ADJUSTED |
| economic whale | 2 | 12.35 | 5.49 | 0.9 | diminished:1 | TRUST_ADJUSTED |
| suspected circular tip network | 1 | 0 | 0 | 0 | rejected:12 | CIRCULAR_ECONOMIC_ACTIVITY |
| cross-faction social butterfly | 6 | 206.94 | 485.32 | 203.82 | diminished:30 | DIVERSE_CROSS_FACTION_REACH, REPEATED_ACTION_DIMINISHING, TRUST_ADJUSTED |
| strongly faction-oriented user | 5 | 149.32 | 180.97 | 55.9 | diminished:30 | DIVERSE_CROSS_FACTION_REACH, REPEATED_ACTION_DIMINISHING, TRUST_ADJUSTED |
| Unaffiliated power user | 7 | 308.67 | 0 | 250.38 | diminished:50 | DIVERSE_CROSS_FACTION_REACH, REPEATED_ACTION_DIMINISHING, TRUST_ADJUSTED |
| future AI/bot builder persona | 6 | 277.37 | 401.36 | 168.94 | diminished:15 | DIVERSE_CROSS_FACTION_REACH, REPEATED_ACTION_DIMINISHING, TRUST_ADJUSTED |
| suspicious Sybil/engagement-ring cluster | 1 | 0 | 0 | 0 | rejected:60 | HIGH_SYBIL_CONFIDENCE |

## Required comparisons

- The viral creator strongly exceeds the spammer (141.71 versus 0.89 personal contribution).
- The cross-faction viral creator generates far more simulated faction value than the same-faction ring (415.65 versus 0.96).
- A $1,000 economic whale remains Level 2; amount alone cannot buy a top level.
- Many independent $10 supporters produce more authentic economic contribution than one $200 supporter, while circular tips are rejected.
- The Unaffiliated power user reaches Level 7 with no faction contribution and no faction assignment.
- The high-volume legitimate persona is diminished by neutral repeat decay but is never classified as spam, Sybil, or a ring.
- Identical ledger/policy replay is byte-for-byte deterministic; V2 rebuilds different decisions without mutating raw events.
- Contract tests separately prove that later moderation reversals and economic reversal/refund/chargeback facts remove prior contribution without mutating the original event.

## Weaknesses exposed

- `trustConfidence: 0.9` marks otherwise ordinary events as `diminished`, making the state label noisy. Production design should separate confidence weighting from an adverse decision state or define a neutral tolerance band.
- The synthetic generator attaches scenario-level reach to each event. A production projector must deduplicate people and factions within explicit windows rather than summing repeated aggregate claims.
- The Level curve keeps every scenario in early progression. That is useful for safety but cannot validate the Level 26–100 economy, long-term seasons, or time-to-Apex.
- The social butterfly creates more faction value than the faction-oriented user under these assumptions. This may be consistent with cross-faction strategic reach, but allegiance allocation and internal cohesion need explicit product decisions before production use.
- Binary high-confidence Sybil/circular rejection is intentionally fail-closed in the harness. Production needs evidence provenance, quarantine, appeals, false-positive measurement, and reversals.
- The report explains policy categories but does not yet provide per-event evidence traces or counterfactual analysis; operational review tooling will need both.

These observations were retained rather than hidden with scoring changes. Scores and thresholds are simulator diagnostics, not a production formula or promised balance.
