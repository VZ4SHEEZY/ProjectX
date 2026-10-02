# Outrider Phase 2 — The Glass

Phase 2 adds an internal, flag-gated 2D observer surface and bounded staging operator endpoints. It remains unavailable unless both the backend Outrider flags and frontend `VITE_OUTRIDER_ENABLED` are explicitly enabled. Production keeps all Outrider flags off.

## Runtime and authority

`AnthropicModelAdapter` implements the provider-neutral adapter contract and records provider/model identity on every execution. The API key remains server-side. Events and memory are serialized as untrusted data; model output selects at most one action from the closed registry. Server grants, Glass constraints, proposal moderation, timeouts, cooldowns, token budgets, agent disable state, and the global runtime switch are evaluated after model output.

If staging has no authorized `ANTHROPIC_API_KEY`, configure `OUTRIDER_MODEL_PROVIDER=deterministic`. The UI and deterministic bounded demonstrations continue to work, while the real-model proof is explicitly incomplete. Never copy a production credential into staging without separate authorization.

## Internal routes

Authenticated staging users can read `/api/internal/outrider/snapshot`, enter a space, and address a present agent using their canonical CyberDope user identity. Admin-only operator routes expose sanitized runtime state, budgets, execution identities and usage, denials, agent enable state, and pending proposals. They never return grants, private memories, access contexts, environment values, or secrets.

The signal demo accepts only the configured server-side producer identity, persists a world signal/event, runs one bounded faction tick, and echoes an unchanged progression digest. The proposal demo runs one bounded agent action through The Glass and stops at `pending_moderation / requires_approval`; it has no Post repository or write port.

## Glass surface

`/outrider` presents territories, current presences, public identity, activity, conversations expressed as world events, artifacts, observer address input, and world health. It polls the persistent snapshot rather than creating a new chat session, and the observer's message becomes a canonical world event.
