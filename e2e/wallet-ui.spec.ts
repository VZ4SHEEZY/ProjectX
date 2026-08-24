import { test, expect, login, runtime, userFor } from './fixtures';

const walletAddress = '0x1000000000000000000000000000000000000001';
const creatorWallet = '0x2000000000000000000000000000000000000002';
const routerAddress = '0x3000000000000000000000000000000000000003';
const tokenAddress = '0x4000000000000000000000000000000000000004';
const treasuryAddress = '0x5000000000000000000000000000000000000005';
const txHash = `0x${'ab'.repeat(32)}`;

async function openTip(page: import('@playwright/test').Page) {
  const data = await runtime();
  await login(page);
  await page.goto('/profile');
  await page.getByRole('button', { name: 'SUBSCRIBE' }).click();
  await expect(page.getByText('BASE_SEPOLIA_TIP')).toBeVisible();
  return { data, creator: userFor(data, 'creator') };
}

async function installTransactionWallet(page: import('@playwright/test').Page, failure?: string) {
  await page.addInitScript(({ account, hash, router, error }) => {
    const blockHash = `0x${'cd'.repeat(32)}`;
    let sentData = '0x';
    Object.defineProperty(window, 'ethereum', { value: { request: async ({ method, params }: { method: string; params?: any[] }) => {
      if (method === 'eth_chainId') return '0x14a34';
      if (method === 'eth_accounts' || method === 'eth_requestAccounts') return [account];
      if (method === 'eth_blockNumber') return '0x10';
      if (method === 'eth_estimateGas') {
        if (error) throw new Error(error);
        return '0x186a0';
      }
      if (method === 'eth_sendTransaction') { sentData = params?.[0]?.data || '0x'; return hash; }
      if (method === 'eth_getTransactionReceipt') return {
        transactionHash: hash, transactionIndex: '0x0', blockHash, blockNumber: '0x10', from: account, to: router,
        cumulativeGasUsed: '0x5208', gasUsed: '0x5208', contractAddress: null, logs: [], logsBloom: `0x${'00'.repeat(256)}`,
        status: '0x1', effectiveGasPrice: '0x1', type: '0x2'
      };
      if (method === 'eth_getTransactionByHash') return {
        hash, blockHash, blockNumber: '0x10', transactionIndex: '0x0', from: account, to: router,
        gas: '0x186a0', gasPrice: '0x1', maxFeePerGas: '0x1', maxPriorityFeePerGas: '0x1', input: sentData,
        nonce: '0x0', value: '0x0', type: '0x2', accessList: [], chainId: '0x14a34',
        v: '0x0', r: `0x${'00'.repeat(32)}`, s: `0x${'00'.repeat(32)}`
      };
      throw new Error(`Unsupported test wallet method: ${method}`);
    } } });
  }, { account: walletAddress, hash: txHash, router: routerAddress, error: failure || '' });
}

async function mockIntent(page: import('@playwright/test').Page, _creatorId: string) {
  await page.route('**/api/tips/intents', route => route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({
    success: true, approvalRequired: false, intent: { _id: 'qa-intent', chainId: 84532, tokenAddress, routerAddress, treasuryAddress,
      senderWallet: walletAddress, creatorWallet, amount: '0.01', amountUnits: '10000' }
  }) }));
}

test('wallet rejection is handled without signing or sending', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'ethereum', { value: { request: async () => { const error = new Error('User rejected request'); Object.assign(error, { code: 4001 }); throw error; } } });
  });
  await login(page);
  page.on('dialog', dialog => dialog.dismiss());
  await page.getByRole('button', { name: /Connect Wallet/i }).click();
  await expect(page.getByRole('button', { name: /Connect Wallet/i })).toBeEnabled();
  expect(await page.evaluate(() => localStorage.getItem('walletAddress'))).toBeNull();
});

test('tip UI distinguishes rejected, insufficient, and reverted states', async ({ monitoredPage: page }) => {
  const cases = [
    ['User rejected request', 'Wallet request rejected. No funds were moved.'],
    ['insufficient funds for gas', 'Insufficient Base Sepolia ETH for network fees. No funds were moved.'],
    ['transfer amount exceeds balance', 'Insufficient Base Sepolia USDC for this tip. No funds were moved.'],
    ['execution reverted', 'The TipRouter transaction reverted. No tip was recorded.']
  ];
  await openTip(page);
  for (const [index, [backendError, expected]] of cases.entries()) {
    await page.route('**/api/tips/intents', route => route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: backendError }) }), { times: 1 });
    await page.getByRole('button', { name: 'VERIFY PAYMENT DETAILS' }).click();
    await expect(page.getByText(expected, { exact: true })).toBeVisible();
    await page.getByLabel('Close tip modal').click();
    if (index < cases.length - 1) await page.getByRole('button', { name: 'SUBSCRIBE' }).click();
  }
});

test('tip UI reports pending, confirmed, and duplicate confirmation states', async ({ monitoredPage: page }) => {
  await installTransactionWallet(page);
  const { creator } = await openTip(page);
  await mockIntent(page, creator.id);
  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'VERIFY PAYMENT DETAILS' }).click();
  await page.route('**/api/tips/intents/qa-intent/confirm', route => route.fulfill({ status: 202, contentType: 'application/json', body: JSON.stringify({ pending: true }) }), { times: 1 });
  await page.getByRole('button', { name: 'CONFIRM IN WALLET' }).click();
  await expect(page.getByText('TIP PENDING')).toBeVisible();
  await page.route('**/api/tips/intents/qa-intent/confirm', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, duplicate: true }) }), { times: 1 });
  await page.getByRole('button', { name: 'CHECK CONFIRMATIONS' }).click();
  await expect(page.getByText('TIP CONFIRMED')).toBeVisible();
  await expect(page.getByText(/already verified; no duplicate payment/i)).toBeVisible();
});
