# Outrider Phase 0 Architecture

## Product boundary

CyberDope remains the human-facing canonical platform. Outrider is a separate persistent AI world. The Glass is the only integration boundary. Phase 0 adds no public route, runtime, worker, scheduler, model invocation, or deployment, and every Outrider flag defaults to false.

```text
CyberDope application services
  |  versioned signals (approved, minimized read models)
  v
THE GLASS: authentication -> grant -> policy/constraints -> audit -> typed port
  ^
  |  proposals (never direct canonical writes)
Outrider agents, memory namespaces, spaces, events, artifacts, conversations
```

## Domains and persistence

Outrider uses `outrider_*` collections, deliberately separate from users, posts, payments, faction memberships, and all Release 3 progression collections.

- `outrider_agents`: persistent identity, type, optional canonical faction/owner references, runtime identity, memory namespace, world/personality/voice/creative configuration, lifecycle, version.
- `outrider_capability_grants`: explicit agent/capability grants, constraints, policy version, lifecycle and expiry.
- `outrider_world_spaces`: lightweight 2D/web locations, visibility, state and current agent presence.
- `outrider_world_events`: immutable public/restricted happenings within a space.
- `outrider_agent_relationships`: directed allies, rivals, mentors and collaborators with bounded strength.
- `outrider_observer_sessions`: canonical CyberDope user references entering a space; no duplicate human identity.
- `outrider_artifacts`: AI-created media metadata and provenance.
- `outrider_conversations`: agent-agent or observer-agent conversation containers with explicit memory policy.
- `outrider_world_signals`: immutable, versioned, producer-authenticated CyberDope-to-Outrider facts.
- `outrider_proposals`: staged Outrider-to-CyberDope intents and their canonical result reference.
- `outrider_glass_audit`: immutable allow/deny decisions for every capability request.

Faction agents use `agentType=faction` and require exactly one canonical faction reference; a unique partial index permits one persistent agent per faction. Their personality, goals (world state), memory namespace, voice and creative configuration are independent. `agentType=independent` requires no faction, making Unaffiliated agents first class rather than a fabricated faction.

## Service shape

`GlassGateway` validates the versioned envelope, authenticates an active agent, resolves an unexpired active grant, maps a closed capability enum to one adapter method, and audits the outcome. Unknown capabilities fail closed. The adapter accepts only canonical application-service ports; it never imports Mongo models or exposes arbitrary queries.

`WorldSignalService` accepts only `1.0.0` signals from configured producers and only `public` or `agent_permitted` visibility. `OutriderWorldService` manages domain persistence and keeps observer sessions distinct from conversations.

## Signal and proposal contracts

A signal contains `id`, `contractVersion`, `type`, trusted `source`, typed `subject`, visibility, `occurredAt`, and a minimized payload. Initial candidate producers are canonical product services (for example progression-product), not database change streams. Candidate signal types include progression milestones, approved faction-world changes, public posts, creator activity, public faction events, and world achievements.

A proposal is an authenticated capability request containing a typed intent. The Glass records it, then a canonical CyberDope proposal service must apply ordinary authorization, access/age policy and moderation before invoking the existing canonical application service. A resulting post/event therefore emits its normal outbox and progression activity; Outrider has no scoring path and no scoring bypass.

## Progression integration

The only progression port is `readApprovedProgression(subjectId, context)`. It is intended to call the Release 3 product/read-model layer with its existing rollout and authorization checks. Outrider never imports progression persistence and cannot write activity events, decisions, contributions, projections, policies, outbox records, leases, or gates. Progression-derived world signals are immutable minimized facts emitted by an approved product-service producer, not collection listeners.

## Phase 1 recommendation

Keep production off. In an isolated staging environment, add migrations/index readiness for the Outrider collections, implement signed service identity for signal producers and agents, build the canonical proposal application services with moderation, and expose one read-only internal operator view plus a bounded synthetic faction-agent simulation. Do not add autonomous production execution until audit durability, constraint evaluation, rate/budget limits, prompt-injection defenses, and kill-switch exercises pass.
