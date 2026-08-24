# CyberDope isolated browser E2E

`npm run test:e2e` starts an ephemeral in-memory MongoDB, a test-mode backend, and Vite on loopback only. Three random-password QA users are marked `isQaAccount`; the database is destroyed when the run exits. The QA control plane is mounted only when `QA_E2E_ENABLED=true` and `NODE_ENV` is not `production`, requires a timing-safe random header secret, and can delete only marked QA users.

Tests run serially on desktop Chromium and a Pixel 7 viewport. They fail on uncaught browser errors, console errors, or HTTP 5xx responses. Traces and screenshots are retained only on failure. Wallet cases use an injected rejecting provider; payment execution is disabled and no RPC, wallet key, signature, or transaction is used.

CI creates the same isolated environment. No application or QA credentials are stored in GitHub Actions; all tokens and passwords are generated in-process and written only to a gitignored mode-0600 runtime file.
