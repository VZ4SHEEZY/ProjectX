# External integration verification

`npm run test:external --prefix backend` verifies the real external boundaries that the isolated Playwright suite deliberately mocks, without creating a new blockchain transaction.

`npm run test:e2e:external` additionally drives the real wallet-connect UI with a MetaMask-compatible EIP-1193 provider. The provider begins on Ethereum mainnet, verifies the application's Base Sepolia switch request, and signs the backend-issued SIWE message with the disposable wallet in Node. The private key is never injected into the browser context.

The harness uses:

- the gitignored `.secrets/base-sepolia.env` disposable wallet file;
- `RENDER_API_KEY` to read the deployed configuration in memory;
- an ephemeral MongoDB for SIWE challenges and payment persistence;
- the previously mined disposable 0.01 USDC Base Sepolia tip;
- read-only RPC simulation for insufficient ETH and USDC;
- a generated 1x1 Cloudinary image that is deleted in the same run.

The script prints and writes only a redacted result containing public chain facts. It never prints private keys, RPC URLs, provider credentials, or Cloudinary credentials. `.e2e/external-results.json` is mode `0600` and ignored by Git.

This check is intentionally local/manual. It must not run in GitHub Actions because CI has no persistent wallet key, RPC secret, Cloudinary secret, or Render API credential. Yoti is reported as unverified while its implementation remains stubbed and its deployed environment is unconfigured.

No new transaction is broadcast. To test a new approval/payment, explicitly authorize that transaction after checking disposable ETH/USDC balances; the UI must always approve only the exact tip amount.
