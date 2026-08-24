import { test, expect, login } from './fixtures';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Wallet } from 'ethers';

const enabled = process.env.EXTERNAL_E2E === '1';

const secretWallet = async () => {
  const text = await readFile(process.env.BASE_SEPOLIA_SECRET_FILE || resolve('.secrets/base-sepolia.env'), 'utf8');
  const values = Object.fromEntries(text.split(/\r?\n/).flatMap(line => {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    return match ? [[match[1], match[2].trim().replace(/^(['"])(.*)\1$/, '$2')]] : [];
  }));
  return new Wallet(values.TEST_TIPPER_PRIVATE_KEY);
};

test.describe('external wallet boundary', () => {
  test.skip(!enabled, 'Runs manually with a local disposable wallet; never in credential-free CI');

  test('MetaMask-compatible wrong-network switch leads to successful real SIWE signature', async ({ monitoredPage: page }) => {
    const wallet = await secretWallet();
    let chainId = '0x1';
    let switchRequests = 0;

    await page.exposeFunction('__qaWalletRequest', async ({ method, params }: { method: string; params?: unknown[] }) => {
      if (method === 'eth_requestAccounts' || method === 'eth_accounts') return [wallet.address];
      if (method === 'eth_chainId') return chainId;
      if (method === 'wallet_switchEthereumChain') {
        expect((params?.[0] as { chainId: string }).chainId).toBe('0x14a34');
        chainId = '0x14a34';
        switchRequests += 1;
        return null;
      }
      if (method === 'personal_sign') {
        const [message, requestedAddress] = params as [string, string];
        expect(requestedAddress.toLowerCase()).toBe(wallet.address.toLowerCase());
        return wallet.signMessage(message);
      }
      throw new Error(`Unsupported QA wallet method: ${method}`);
    });
    await page.addInitScript(() => {
      Object.defineProperty(window, 'ethereum', {
        configurable: true,
        value: { isMetaMask: true, request: (request: { method: string; params?: unknown[] }) => (window as any).__qaWalletRequest(request) }
      });
    });

    page.on('dialog', dialog => dialog.accept());
    await login(page);
    await page.getByRole('button', { name: /Connect Wallet/i }).click();
    await expect.poll(() => page.evaluate(() => localStorage.getItem('walletAddress'))).toBe(wallet.address);
    expect(switchRequests).toBe(1);
    expect(chainId).toBe('0x14a34');
    await expect(page.getByRole('button', { name: new RegExp(`${wallet.address.slice(0, 6)}.*${wallet.address.slice(-4)}`, 'i') })).toBeVisible();
  });
});
