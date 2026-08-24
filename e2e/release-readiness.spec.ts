import { test, expect, login } from './fixtures';

test('unsupported verification is explicit and does not collect identity media', async ({ monitoredPage: page }) => {
  await login(page);
  await page.getByTitle('Settings').click();
  await expect(page.getByText('Identity verification unavailable')).toBeVisible();
  await expect(page.getByText(/will not collect your ID or selfie/i)).toBeVisible();
  await expect(page.locator('input[type="file"]')).toHaveCount(1);
  await expect(page.getByText(/LIVE \(SOON\)/)).toHaveCount(0);
});

test('settings avatar validates locally and reflects a successful managed upload', async ({ monitoredPage: page }) => {
  await login(page);
  await page.route('**/api/upload/avatar', async route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { url: 'https://res.cloudinary.com/qa/image/upload/cyberdope/avatars/replacement.webp' } }) }));
  await page.getByTitle('Settings').click();
  const chooser = page.getByLabel('Choose avatar image');
  await chooser.setInputFiles({ name: 'bad.gif', mimeType: 'image/gif', buffer: Buffer.from('gif') });
  await expect(page.getByText(/must be a JPG, PNG, or WebP/i)).toBeVisible();
  await chooser.setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: Buffer.from('png') });
  await expect(page.getByAltText('Current avatar')).toHaveAttribute('src', /replacement\.webp/);
  await expect(page.getByRole('button', { name: 'Replace avatar' })).toBeVisible();
});

test('creator can edit and persist the active tier catalog UI', async ({ monitoredPage: page }) => {
  await login(page, 'creator');
  await page.goto('/profile');
  await page.getByRole('button', { name: 'EDIT TIERS' }).click();
  await expect(page.getByText(/Subscription checkout and recurring billing are not currently available/i)).toBeVisible();
  await page.getByRole('button', { name: 'ADD CUSTOM TIER' }).click();
  await page.getByText('Tier Name').locator('..').locator('input').fill('Browser Tier');
  await page.getByRole('button', { name: 'SAVE CHANGES' }).click();
  await page.getByRole('button', { name: 'SAVE TIERS' }).click();
  await page.getByRole('button', { name: 'EDIT TIERS' }).click();
  await expect(page.getByText('Browser Tier')).toBeVisible();
});
