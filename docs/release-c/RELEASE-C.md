# Release C: Creator Mode, testnet monetization and launch readiness

Built on Release B (`357da80`). `/creator` is the authenticated Creator Studio and `/creators` discovers authorized public creator profiles. Activation updates the existing User, Creator and AccountCapability records transactionally and retains the existing progression approval event. It grants no age or identity assertion and does not alter scoring, profile IDs, factions, relationships or published content.

Studio reuses Profile Studio modules, the post composer, membership configuration and creator receipt dashboard. Its audience overview uses actual account counts; unsupported reach/growth metrics remain explicitly unavailable. Owners can edit, archive and republish ordinary content. Removed or restricted content cannot be republished. Earnings use lifetime confirmed receipt totals rather than a truncated recent list; recent receipts remain bounded to 100.

All tip entry points share the existing Base Sepolia payment intent flow. Wallet execution accepts only chain 84532, uses exact token approval, validates the backend's stored wallet/router intent against on-chain calldata and receipt events, and requires three confirmations. Submitted transactions recover from session storage and cannot be resent through a retry button. Receipts are authenticated and private, include explorer links, and record confirmed/pending/reverted states. RPC failure remains recoverable and does not become an invented success. No mainnet or real-money checkout is enabled.

No legitimate verification adapter is currently installed. Restricted-content access fails closed even for legacy verification flags, owner views, and content updates. Manual admin identity overrides and simulated verification are disabled. Users are not prompted for unavailable verification on every visit. No ID or selfie is collected.

Reporting uses existing Post report records and platform roles. Reports are deduplicated per reporter/post; public responses omit reporter records, payment details and purchase history. Moderators review, dismiss or remove reported posts; only admins can suspend ordinary accounts. Privileged accounts cannot be suspended from this queue. Enforcement and existing administrative post changes commit with their audit records or roll back together. The queue and audit history are available in Admin Control; effective moderator/admin roles are resolved on session restoration.

## Validation and review

Run the complete backend suite (including Release A/B, progression and Outrider), the named progression and Outrider scripts, TypeScript, production build, Vercel binding tests, contract tests, and Playwright desktop/mobile tests. Payment provider adapters in tests exist only in disposable local processes; they cannot authorize staging or production transactions. External wallet and approved progression-manifest tests retain credential-based skips.

Manual staging URLs:
- https://cyberdope-staging.vercel.app/creator
- https://cyberdope-staging.vercel.app/creators
- https://cyberdope-staging.vercel.app/profile
- https://cyberdope-staging.vercel.app/admin
- https://cyberdope-staging.vercel.app/factions/neon_wraith
- https://cyberdope-staging.vercel.app/outrider
- https://cyberdope-api-staging.onrender.com/api/tips/contract/status

## Remaining launch gates

A legitimate verification provider integration, authenticated provider assertions/webhooks and operational approval are required before restricted content can open. Live testnet wallet acceptance requires a dedicated Base Sepolia RPC, independently verified TipRouter deployment/code hash, treasury and token configuration, funded test wallets, and wallet signing. Staging leaves execution disabled when those dependencies are missing. Paid memberships, bank payouts and real payments remain unavailable. These limitations are shown in the UI, not represented as successful analytics or payments.

Git auto-deployments are disabled for this release branch in repository configuration so pushing cannot create shared-project previews. Manual deployment still targets the isolated staging project.

Only the isolated `cyberdope-staging` Vercel project and `cyberdope-api-staging` Render service may receive this release. Production, progression scoring, Outrider runtime and DGX are unchanged.
