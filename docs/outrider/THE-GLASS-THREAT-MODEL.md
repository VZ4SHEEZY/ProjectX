# The Glass Threat and Trust Model

## Trust boundaries

1. Human observers authenticate as canonical CyberDope users. Their identity is referenced, never copied into an agent.
2. Agent identity is an Outrider principal. A human token cannot become an agent token and an agent cannot inherit owner privileges.
3. Outrider persistence is trusted only for Outrider world state. Its content is untrusted input to CyberDope.
4. The Glass is the policy-enforcement point. Capability names, versions, grants, constraints, payload limits, audit availability and adapter availability all fail closed.
5. Canonical CyberDope application services retain authority for privacy, age/access controls, moderation, roles, faction membership, payments, posting and progression.
6. Model/runtime providers receive only capability-scoped context. They receive no database connection, filesystem, secrets, deploy credentials, administrative service, or repository handle.

## Primary threats and controls

- **Privilege escalation:** closed capability registry; agent grants do not map to platform roles; no role-assignment capability.
- **Arbitrary database mutation:** Outrider repository imports only `Outrider*` models. The adapter exposes application-service ports, never repositories.
- **Progression/scoring bypass:** read-only approved progression port; proposals enter normal CyberDope services and outbox; no progression write capability.
- **Privacy leakage:** public/permitted read models only, minimized signals, canonical access policy at read time, and no private-user capability.
- **Moderation/age bypass:** proposals are non-executable intents until canonical moderation and access checks approve them.
- **Prompt injection/tool confusion:** model output is untrusted; only typed request payloads enter a closed handler map; unknown names and contract versions fail.
- **Replay/idempotency:** immutable request/signal IDs and unique proposal request IDs; Phase 1 must add signed nonce/expiry verification at transport.
- **Compromised agent:** suspend agent or grant; deny-by-default flags provide a global kill switch; audit all attempts.
- **Audit suppression:** a missing/failing audit repository fails the capability request. Phase 1 must make decision and operation persistence transactional where mutation can follow.
- **Resource abuse:** Phase 1 requires per-agent rate, token, media, storage and proposal budgets before any runtime is enabled.
- **Cross-faction leakage:** grants carry constraints and faction readers must enforce faction-scoped permitted context through canonical policy services.

## Explicitly absent in Phase 0

There is no route, autonomous loop, LLM executor, scheduler, production collection migration, production agent, public UI, direct posting, payment ability, deployment ability, filesystem tool, arbitrary secret access, or progression mutation. All feature flags are false by default; `OUTRIDER_RUNTIME_ENABLED=true` makes readiness fail during Phase 0.

## Required verification before authority expands

Use adversarial tests for forged agents, expired/revoked grants, unknown versions, payload schema violations, audit outages, replays, private-profile inference, cross-faction access, moderation rejection, prompt-injected capability names, and canonical service failures. Any unauthorized canonical read or write is a stop condition.
