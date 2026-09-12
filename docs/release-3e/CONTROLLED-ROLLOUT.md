# Release 3E controlled rollout runbook

Release 3E adds rollout infrastructure only. It does not change scoring, persistence or ingestion semantics, faction membership, creator authority, payments, payouts, or the Release 3D presentation. All production progression flags remain false in `render.yaml`.

## Runtime architecture and ordering

ProjectX runs an Express web service on Render and uses MongoDB transactions for domain-write/outbox atomicity. Structured JSON logs, `/api/health`, and privileged `/api/admin/diagnostics` are the existing health patterns. The web server only starts the in-process shadow worker when both `PROGRESSION_OPERATIONS_ENABLED=true` and `PROGRESSION_SHADOW_WORKER_ENABLED=true`; the recommended production topology is the dedicated `npm run progression:worker` process so requests never depend on progression work.

Execute and record these stages separately, stopping on any failed preflight:

1. Back up the database and record deployment revision, database target, document counts, and active policy identity.
2. Run Release 3B preflight: `node migrations/004-release-3b-shadow-foundation.js`.
3. Run Release 3C preflight: `node migrations/005-release-3c-shadow-ingestion.js`.
4. Run Release 3E preflight: `npm run progression:migrate`.
5. Confirm every preflight reports no destructive changes and Release 3E reports `transactionCapable: true` with a replica set or sharded deployment.
6. In a controlled maintenance command only, set `CONFIRM_RELEASE_3E_MIGRATION=APPLY` and run `npm run progression:migrate -- --apply`. It is additive and idempotent.

Never use `--allow-data-loss` for Release 3B/3C production rollback. Release 3E refuses to remove non-empty operation checkpoints. Rollback is normally code rollback plus flag-off; retain ledger, outbox, projections, and checkpoints for recovery and audit.

## Historical backfill

Preflight/dry-run is the default:

```text
npm run progression:backfill -- --operation release-3e-posts-dry --batch-size 100
```

After counts and sample identities are approved, enqueue with a distinct stable operation key and `CONFIRM_PROGRESSION_BACKFILL=APPLY`. The cursor is persisted after every bounded batch; rerunning the same key resumes, canonical event IDs prevent duplicates, and the existing worker feeds Release 3B persistence. Progress is visible in structured output and privileged diagnostics.

Only extant published posts are backfillable as `creation.published`: their immutable post ID, author, and creation timestamp provide an authoritative transition identity. Membership is resolved at the event timestamp from `joinedAt`/`endedAt`, so Unaffiliated and historical faction snapshots remain distinct. Do not backfill legacy likes/views, removed comments or relationships, tips lacking independently persisted finality evidence, or creator state lacking an authoritative approval timestamp. Current counters are not historical evidence.

## Worker and rebuild operation

The dedicated worker requires both `PROGRESSION_OPERATIONS_ENABLED=true` and `PROGRESSION_SHADOW_WORKER_ENABLED=true`. The operations flag is the global emergency kill switch; the shadow-worker flag pauses only worker consumption. Configure bounded values after staging load tests:

- `PROGRESSION_WORKER_POLL_MS` (minimum effective cadence 250 ms)
- `PROGRESSION_WORKER_BATCH_SIZE` (maximum 500)
- `PROGRESSION_WORKER_CONCURRENCY` (maximum 8)
- `PROGRESSION_WORKER_MAX_ATTEMPTS` (default 8)
- `PROGRESSION_REBUILD_SCHEDULER_ENABLED` (explicit `true` only)
- `PROGRESSION_REBUILD_CADENCE_MS` (minimum 15 minutes; recommended 6 hours)
- `PROGRESSION_REBUILD_BATCH_SIZE` (recommended 25)
- `PROGRESSION_REBUILD_CONCURRENCY` (maximum 8)
- `PROGRESSION_POLICY_ID`, `PROGRESSION_POLICY_VERSION`, `PROGRESSION_POLICY_ARTIFACT_DIGEST`
- `PROGRESSION_ALERT_POLL_MS` (30 seconds to 15 minutes; default 60 seconds)

The worker claims records atomically, drains bounded batches, backs off failures, stops retrying at the configured attempt ceiling, recovers five-minute stale leases, and drains for up to 30 seconds on SIGTERM/SIGINT. Duplicate deliveries are absorbed by canonical persistence. User requests remain independent of worker state. Pause it by setting `PROGRESSION_SHADOW_WORKER_ENABLED=false` and restarting the worker service; the dedicated process then fails closed before connecting to MongoDB. Setting `PROGRESSION_OPERATIONS_ENABLED=false` is the broader emergency stop. Neither switch deletes outbox records, ledger events, or checkpoints, and worker pause does not disable ingestion into the outbox.

Rebuilds accept only an exact persisted policy identity. `npm run progression:rebuild -- --user <id>` isolates one user; the global command pages active users by `_id`, persists a cursor and counts, resumes after interruption, and isolates per-user failures. Failed subjects remain in the checkpoint and receive a bounded three-round retry budget before the operation terminates failed for operator review. Raw events are never publicly mutable. The optional scheduler assigns each cadence window a deterministic operation key and prevents overlapping local runs.

The production policy artifact must be approved and persisted before staging rebuild. The simulator artifact is marked simulation-only and must not be selected for production.

## Freshness and observability

Product freshness policy `release-3e-v1` maps a missing checkpoint to `unavailable`, and an existing checkpoint to `current` or `stale`. `PROGRESSION_PRODUCT_STALE_AFTER_MS` defaults to six hours, is bounded from one minute to seven days, and should be greater than the proven rebuild completion interval. The public API exposes only state, policy version, and `updatedAt`; queue health and operation checkpoints stay privileged.

Admin diagnostics report outbox pending/processing/processed/failed/retrying counts and oldest pending age; worker last success/failure, rate, retry rate, and stale-lock recoveries; projection availability/staleness, rebuild success/failures/duration/checkpoint; and backfill cursor/counts/error.

Initial alert thresholds for staging and controlled rollout:

- page: worker has no success for two poll-and-batch windows while pending work exists;
- page: oldest pending age exceeds 15 minutes, a rebuild fails, or migration preflight loses transaction capability;
- warn: any max-attempt failed item, retry rate above 5% for 15 minutes, or stale projection count above 1% after a completed rebuild;
- warn: scheduled rebuild duration exceeds four hours (two-thirds of the default freshness window);
- ticket: unavailable projections remain after a successful initial global rebuild.

Alert routing and named on-call ownership must be configured in Render/log aggregation before activation; this repository intentionally contains no credentials or external notification endpoints.

The dedicated worker evaluates and emits alerts on a bounded cadence. Alerts use structured `progression_operational_alert` log records with stable codes: `OUTBOX_BACKLOG_AGE`, `WORKER_REPEATED_FAILURE`, `PROJECTION_REBUILD_FAILURE`, `EXCESSIVE_STALE_PROJECTIONS`, `OPERATION_STALLED`, `MIGRATION_FAILURE`, and `TRANSACTION_CAPABILITY_FAILURE`. Admin diagnostics evaluates the same contract. Alert payloads contain aggregate operational values and operation keys, never raw events, evidence, policy artifacts, producer identities, trust/fraud detail, hidden allegiance, or platform roles.

## Staging, activation, and rollback

Use a production-shaped staging replica set. Apply migrations, run dry-run/backfill, drain the outbox, persist the approved policy, perform a global rebuild, then validate diagnostics. Smoke test owner/public/private/friends/followers/blocked profiles plus Unaffiliated, faction, creator, unavailable, stale, Level 1, and Apex states on desktop and mobile.

Staged activation uses `PROGRESSION_ROLLOUT_STAGE` on the backend and `VITE_PROGRESSION_ROLLOUT_STAGE` at frontend build time. Invalid/missing values become Stage 0. Stage 1 accepts only internal/admin accounts; Stage 2 uses `PROGRESSION_ROLLOUT_SMALL_COHORT`; Stage 3 uses `PROGRESSION_ROLLOUT_LARGE_COHORT`; Stage 4 is general availability. Cohort entries are exact user IDs or usernames and affect presentation access only—not scoring, faction state, creator state, or platform authority. Staged activation order is fail-closed:

1. Keep `USER_FACING_PROGRESSION_ENABLED=false` and `VITE_USER_FACING_PROGRESSION_ENABLED=false` while migrations, backfill, worker, rebuild, and health validation run.
2. Deploy matching backend/frontend code with flags still false.
3. Confirm one-sided flag or stage combinations expose neither API nor UI.
4. Enable both flags only for an explicitly approved cohort/environment configuration, observe at least one freshness window, then expand in recorded stages.

Immediate rollback: set either user-facing flag false (prefer both), verify API returns 404 and UI is absent, stop rebuild scheduling, and leave ingestion/ledger data intact unless incident command explicitly stops shadow ingestion. Code rollback must remain compatible with additive collections. Never delete canonical events, evidence, decisions, outbox entries, projections, or operation checkpoints as an emergency rollback.

Production execution, deployment, flag changes, alert-channel configuration, and live smoke tests are Release 3E rollout actions requiring separate authorization; none are performed by this change.

## Repeatable staging smoke test

Create a private JSON manifest outside source control containing an approved staging base URL, bearer token, and named cases for owner/self, public, private, friends-only, followers-only, blocked, Unaffiliated, affiliated, creator, Level 1, mid-level, Apex, unavailable, stale, and current projections. Add approved profile paths for layout checks. Run `PROGRESSION_SMOKE_MANIFEST=/secure/path/manifest.json npm run test:e2e:progression-staging`; Playwright runs the API/privacy matrix and the same UI check in desktop Chromium and Pixel 7 projects. The test skips without a manifest and never creates or guesses production users. Capture loading/error behavior in the isolated Release 3D suite and validate real staging error handling by temporarily targeting a non-mutating unavailable projection case.

## Recovery procedures

- Flag rollback: set both user-facing flags and both rollout stages to false/zero, redeploy the matching backend/frontend configuration, and verify API 404 plus absent UI.
- Worker pause/restart: turn only `PROGRESSION_SHADOW_WORKER_ENABLED` off and restart, allowing the prior process to complete its SIGTERM drain; the replacement fails closed before connecting. Restart again with both `PROGRESSION_OPERATIONS_ENABLED` and `PROGRESSION_SHADOW_WORKER_ENABLED` true. The operations flag remains the global kill switch. Pending and failed records remain restart-safe.
- Failed outbox/stale lease: inspect admin diagnostics and structured errors. A restart recovers leases older than five minutes. Correct the underlying cause; records below the attempt cap retry automatically. Do not rewrite payloads or reset attempts without an incident-approved, audited procedure.
- Failed rebuild: rerun the same operation key to resume its cursor and failed-subject checkpoint. After the bounded retry budget, investigate and use a new recorded operation key only after the cause is corrected.
- Failed backfill batch: rerun the same operation key and same dry-run/apply mode. It resumes after the last committed cursor; canonical event IDs and the unique outbox index absorb duplicates.
- Failed migration: stop before backfill, retain the additive collection, correct capability/index problems, rerun preflight, then rerun the idempotent apply. Only an empty Release 3E operations collection may be rolled back.
- Shadow-safe product disable: disable API/UI flags and stages while leaving the operations gate and worker enabled. This keeps ingestion and projections internal.

## Activation GO/NO-GO checklist

Production is **NO-GO** unless every required item below has linked evidence, an owner, timestamp, environment, and revision:

- [ ] Release 3B, 3C, and 3E migration preflights are clean and non-destructive.
- [ ] MongoDB reports a replica set or sharded topology with transaction capability.
- [ ] Approved backups, restore procedure, and additive code rollback compatibility are verified.
- [ ] Exact production policy ID, version, and SHA-256 artifact digest are approved and persisted; no simulation-only artifact is selected.
- [ ] Shadow worker startup, bounded processing, SIGTERM drain, restart recovery, retry ceiling, and stale-lock recovery pass in production-shaped staging.
- [ ] Historical backfill is complete or its intentional scope/exclusions are signed off, with final checkpoint and counts recorded.
- [ ] No unresolved max-attempt failed outbox records exist; backlog age and retry rate are within thresholds.
- [ ] Global rebuild completes, failed-subject checkpoint is empty, and current/stale/unavailable counts meet the approved freshness target.
- [ ] Admin-only observability and all seven structured alert conditions reach the named staging/on-call route.
- [ ] Owner, public, private, friends, followers, and blocked privacy smoke cases pass without private internal fields.
- [ ] Unaffiliated (including `vz4sheezy`), faction-affiliated, creator, Level 1, mid-level, Apex, unavailable, stale, and current states are validated.
- [ ] Loading/error presentation and desktop/mobile layouts pass.
- [ ] Backend/frontend flags and rollout stages are coordinated and one-sided combinations fail closed.
- [ ] Immediate flag-off rollback, worker pause/restart, checkpoint resume, and API/UI-off with shadow ingestion continuing are exercised.
- [ ] Stage owner, cohort manifest, observation window, escalation owner, and rollback decision-maker are recorded.

Only after every checkbox is objectively satisfied may the release owner record production GO. This repository change does not satisfy live-environment checks and therefore does not mark production GO.

## Production runbook

1. Record revision, environment, operators, approvals, backup/restore evidence, policy identity, and rollback owner.
2. Run 3B → 3C → 3E preflights against the explicitly verified target; stop on any mismatch or transaction failure.
3. Apply additive migrations using the documented confirmations, then repeat preflight and index inspection.
4. Run backfill dry-run with a stable dry-run key; reconcile counts and exclusions. With separate approval, run apply using a distinct stable key and monitor checkpoint/counts.
5. Start the shadow worker with UI/API disabled. Drain the outbox and resolve all terminal failures.
6. Persist the approved non-simulation policy identity and run the global rebuild; verify checkpoint completion and freshness.
7. Exercise alerts and the approved staging smoke manifest on desktop/mobile. Complete the GO/NO-GO evidence record.
8. Deploy coordinated code/config at Stage 0. Advance one recorded stage at a time only under separate activation authorization, observing at least one approved freshness/alert window per stage.
9. On any breach, immediately return both stages to 0 and flags false. Preserve immutable history, ingestion data, and checkpoints; follow the recovery section.
