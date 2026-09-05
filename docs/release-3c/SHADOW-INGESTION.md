# Release 3C live shadow ingestion

Release 3C connects existing application writes to the private Release 3B ledger. It remains shadow-only: no routes expose events, decisions, projections, levels, unlocks, faction power, payment outcomes, or payout behavior.

## Integrated actions

- Published post creation (`creation.published`)
- New comments and replies, post likes, and comment likes (`engagement.received`)
- Public follows and accepted friendships (`relationship.formed`)
- Creator approval (`achievement.reached`)
- Finalized, independently verified tips (`economy.support.final` with economic-finality evidence)

Every event uses the Release 3A canonical identity tuple, immutable application object IDs and transitions, server-owned producer namespaces, application timestamps, actor/beneficiary faction-membership snapshots, provenance, schema version, and deterministic delivery identity. Unaffiliated users remain valid.

Domain writes and outbox creation share a MongoDB transaction. This requires a replica-set-capable MongoDB deployment. The outbox worker claims entries in creation/event-ID order, retries failures with bounded backoff, reclaims stale leases after restart, and relies on Release 3B canonical duplicate handling for safe redelivery. Processing failure is retained on the outbox record and does not reverse or fail an already committed user action.

The worker writes evidence before its canonical event and Release 3B remains the progression ledger authority. Internal projections can be rebuilt through the existing persisted-policy replay service; no projection is connected to public runtime behavior.

Internal operational inspection reports pending/processing, processed, failed and retry counts, the last successful processing time, and producer/source classifications. Processing and rebuild failures use the existing structured logging/error conventions. These facilities are backend-only and are not mounted on a public route.

## Intentionally deferred

- Unlike/unfollow/friend-removal correction policy and moderation-driven lifecycle corrections
- Reach, fraud/trust, and aggregation evidence producers
- Subscription lifecycle events and unavailable live-stream activity
- Outbox dashboards, alert routing, dead-letter operations, manual recovery tooling, and multi-worker load tuning
- Scheduled projection rebuild orchestration and checkpoint resume
- Any public progression API, UI, levels, unlocks, faction-power behavior, payouts, or payment changes

Content views remain explicitly progression-ineligible. Notifications are delivery side effects, not progression producers.
