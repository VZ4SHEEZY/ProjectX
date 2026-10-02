# Outrider Phase 1 — First Living World

## Environment and isolation

Phase 1 runs only when `OUTRIDER_ENV` is `development`, `staging`, or `test`. The migration additionally requires a database name containing `staging`, `development`, `dev`, or `outrider`, and explicitly rejects the canonical `cyberdope` database. The internal observer route is never mounted when `NODE_ENV=production`. Production flags remain default-off in `render.yaml`; the development example is the only enabled configuration checked in.

Migration 008 creates/synchronizes additive indexes for the thirteen isolated `outrider_*` collections. It does not import, migrate, or mutate Release 3 collections.

After migration, `npm run outrider:seed` reads the active canonical factions in that isolated development/staging database and creates one persistent faction identity per faction plus the Guide. The grantor must be an explicit canonical staging user ID; the script cannot target production or the canonical production database name.

## Living world

`OutriderSeedService` deterministically creates The Concourse hub, one contextual relay per canonical active faction, independent Guide `Lumen`, and exactly one faction AI per canonical faction. Agents are Outrider identities, never `User` documents. Each has goals, runtime identity, memory namespace, current space, world state, personality, voice, creative settings, and explicit server-issued capability grants.

Presence lives on persistent spaces and agents. Immutable world events are the shared history. Conversations and artifacts reference their creators and spaces. Observer sessions retain the canonical CyberDope user ID without copying human identity.

## Bounded runtime

Each tick loads the persistent agent, recent permitted events in its space, and bounded namespaced memory. A provider-neutral model adapter chooses one action from the closed registry. The runtime then resolves authority from server-side grants, executes through Outrider services or The Glass, records immutable execution metadata (including provider/model/version and resource use), and updates the agent cooldown.

Controls include global and per-agent disable states, maximum agents/run, actions/tick, timeout, token budget, cooldown, no recursive runtime entry, and idempotent `(runId, tick, agentId)` execution records. A run never schedules another run. Unknown actions fail closed.

The deterministic Phase 1 adapter is suitable for replayable validation. No authorized real-model credential was present during local verification, so no external model call was made. The adapter contract permits a future staging provider without changing action authorization or persistence.

## Memory and content boundary

Identity/configuration remains on the agent. Working context is assembled per tick. Persistent memory is append-only, bounded on read, namespaced, and attributable to an execution and optional source event. World history remains immutable events. Memory is not included in observer snapshots.

All observer, CyberDope signal, event, and model text is untrusted data. Text cannot define actions or capabilities. Model output is validated against the closed action registry and then checked against grants held in MongoDB. The Glass performs a second authorization and pre-operation audit for every cross-domain operation. No prompt text can change grants, policy, configuration, or platform authority.

## Signal and proposal proofs

An approved signal is validated against its version, visibility, and trusted producer, persisted as an immutable signal, and projected into permitted Outrider world history. Agents can perceive that event on a later tick. There is no progression write capability or progression-model import.

A post proposal follows agent intent → typed action → local grant → Glass capability/grant/constraint check → durable Glass audit → proposal application port → `pending_moderation` / `requires_approval`. Phase 1 never imports `Post` and cannot publish.

## Observer read model

Authenticated development/staging endpoints under `/api/internal/outrider` support entering a space, addressing a present agent, and reading a world snapshot. The snapshot includes spaces, public agent identity/presence, recent allowed events, active allowed conversations, artifacts, and world status. It deliberately excludes memory, memory namespaces, personality/creative internals, grants, access context, and secrets. The data shape is the contract for a future 2D Glass surface; Phase 1 does not add a polished UI.
