import { test, expect, login } from './fixtures';

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
