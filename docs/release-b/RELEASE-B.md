# Release B: factions, identity, and progression

Release B resumes the partial changes on the merged Release A / Outrider baseline (`998acf5`). All 20 canonical factions share `/factions/:key`, with `/factions` as the discovery directory. The destinations read canonical factions, active memberships, authorized activity, and existing faction projections. Independent users can browse without joining; Unaffiliated remains an identity, not a faction or inferred score.

Profiles label personal progression separately from individual faction contribution. Faction destinations label the aggregate member contribution separately. Existing progression formulas, ingestion, and Outrider runtime are unchanged. Missing checkpoints remain explicitly unavailable. Profile links, notification destinations, Following feed terminology, session recovery, and responsive navigation connect these surfaces.

Faction activity uses existing profile/post access policy, omits deactivated or missing authors, and returns an explicit public content projection. Faction-targeted announcements remain restricted to the target faction. Private progression internals and post purchase, report, earnings, and liker records are excluded.

## Validation

Run `npm test --prefix backend`, `npm run test:progression --prefix backend`, the Release A core-loop suite, `npm run test:outrider --prefix backend`, `npx tsc --noEmit`, `npm run build`, and `npm run test:e2e`. The browser harness uses an isolated in-memory replica set, synthetic presentation checkpoints, and a quiet observer world with no autonomous runtime enabled. Available/unavailable personal progression, independent identity, member/cross-faction discovery, notification routing, saved-session recovery, and desktop/mobile behavior are covered. External wallet/provider and approved-manifest smoke tests retain their explicit credential requirements.

## Staging only

Deploy this revision only to `cyberdope-staging.vercel.app` and `cyberdope-api-staging.onrender.com`. The staging frontend must bind exclusively to the staging API/socket origins, with progression presentation and Outrider UI enabled. Staging progression rollout stage 4 permits ordinary users to read authorized projections; it does not enable workers or change scoring. Preserve the existing Outrider settings. Do not change the production project or production API service.
