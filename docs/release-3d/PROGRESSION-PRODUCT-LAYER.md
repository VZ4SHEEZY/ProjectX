# Release 3D: Progression Product Layer

Release 3D presents the existing shadow projection without changing Release 3A scoring, Release 3B persistence, or Release 3C ingestion. Production activation remains off.

## Level and tier presentation

Presentation config version `release-3d-v1` makes Release 3A's established formula explicit: level `L` begins at `8 × (L − 1)²` contribution, capped at level 100. Tiers are Initiation (1–10), Established (11–25), Influential (26–50), Elite (51–75), Legendary (76–99), and Apex (100). Progress to the next level is derived from adjacent thresholds; scores and weights are never recalculated or modified.

## Read model and privacy

`GET /api/progression/users/:userId` requires the existing bearer-token authentication and delegates visibility to the same `canViewProfile` policy used by ProjectX profiles. Private, followers-only, friends-only, and blocked states therefore fail closed exactly as the profile does. It reads only the latest persisted personal and faction projection checkpoints. It returns the presentation version, explicit projection availability, level/tier progress, public dimensions, faction contribution state, creator presentation state, unlock summaries, and projection update time.

If no personal checkpoint exists, the response reports `projectionState: unavailable`; it does not fabricate Level 1, dimensions, or unlocks. Available projections report `projectionState: available`. Contribution presentation is truncated to two decimals before progress and remaining values are derived, preventing a precise value immediately below an integer threshold from displaying as though it crossed that threshold.

The response intentionally excludes raw events, evidence, qualification decisions/reasons, producer identities, hidden allegiance data, policy artifacts and implementation details, projection contexts/checkpoints, fraud/trust signals, and platform roles. Platform authority, creator approval, and faction membership remain independent domain concepts.

## Profile presentation

The same compact `ProgressionPanel` appears on the owner Holo-Deck and public Profile V2. It uses existing neon profile variables, restrained glow, compact cards, and responsive one/two-column layouts. Personal dimensions and faction contribution are separate surfaces. The panel deliberately stays outside customizable profile module ordering so profile owners cannot forge or suppress derived state.

Unaffiliated members receive normal personal progression and an intentional “Personal signal stands on its own” state; no synthetic faction score is displayed. Creator Mode adds creator-dimension context only when creator status or projection data supports it. Progression does not confer creator status.

## Unlock framework

Unlocks are versioned, config-driven definitions with stable IDs, level requirements, types, names, and descriptions. Release 3D includes only a small presentation-safe set: Signal Mark, Profile Accent, Dimension Spotlight, Signal Aura, Legend Mark, and Apex Signature. They are previews/framework entries, do not gate core account functionality, and do not silently activate unfinished cosmetics.

## Feature gating

Both gates require the exact string `true`:

- Backend: `USER_FACING_PROGRESSION_ENABLED=true`
- Frontend: `VITE_USER_FACING_PROGRESSION_ENABLED=true`

Defaults are off. The backend endpoint requires both environment values to be exactly `true`, while the frontend also independently hides the surface unless its Vite flag is enabled. Enabling either side alone leaves both API and product exposure closed. The Release 3B constant remains `USER_FACING_PROGRESSION_ENABLED = false`, and `SHADOW_MODE = true`. Local and test environments may opt in explicitly; Release 3D does not activate production.

The panel renders compact loading, temporary-error, and not-yet-evaluated states. For available projections, it consumes `updatedAt` and labels checkpoints older than 24 hours as `Update pending`; Release 3E remains responsible for operational scheduling, monitoring, and freshness guarantees.

## Deferred to Release 3E

Production rollout, experiments, operational dashboards, expanded content catalogs, actually applying cosmetic assets, user-selected dimension spotlighting, notification campaigns, and rollout monitoring remain deferred.
