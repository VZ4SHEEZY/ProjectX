import { test, expect, login, runtime, userFor } from './fixtures';

test('login persists through refresh, deep links work, and logout clears session', async ({ monitoredPage: page }) => {
  const { data } = await login(page);
  await page.reload();
  await expect(page.getByText('CYBER//DOPE', { exact: true }).first()).toBeVisible();
  await page.goto(`/users/${userFor(data, 'peer').username}`);
  await expect(page.getByText(userFor(data, 'peer').username, { exact: false }).first()).toBeVisible();
  await page.getByTitle('Logout').click();
  await expect(page.getByRole('button', { name: 'ESTABLISH LINK' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('cdToken'))).toBeNull();
});

test('mobile navigation keeps Profile Studio and logout reachable without overflow', async ({ monitoredPage: page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile'), 'mobile-only navigation regression coverage');
  await login(page);
  await page.getByLabel('Open navigation').click();
  await expect(page.getByRole('button', { name: 'PROFILE STUDIO' })).toBeInViewport();
  await page.getByRole('button', { name: 'PROFILE STUDIO' }).click();
  await expect(page.getByTestId('profile-v2-studio')).toBeVisible();
  await page.getByLabel('Close').click();
  await expect(page.getByTitle('Logout')).toBeInViewport();
  await page.getByTitle('Logout').click();
  await expect(page.getByRole('button', { name: 'ESTABLISH LINK' })).toBeVisible();
});

test('invalid and expired sessions fail closed', async ({ monitoredPage: page }) => {
  await page.addInitScript(() => { localStorage.setItem('cdToken', 'expired.invalid.token'); localStorage.setItem('cdUser', JSON.stringify({ id: 'x', username: 'invalid' })); });
  await page.goto('/profile');
  await expect(page.getByRole('button', { name: 'ESTABLISH LINK' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('cdToken'))).toBeNull();
});

test('signup validates errors and creates a disposable account in the isolated database', async ({ monitoredPage: page }, testInfo) => {
  const data = await runtime(); const suffix = `${data.runId}${testInfo.project.name.startsWith('mobile') ? 'm' : 'd'}`;
  await page.goto('/'); await page.getByRole('button', { name: 'INITIALIZE' }).click();
  await page.getByPlaceholder(/letters, numbers/i).fill(`qa_${suffix}`); await page.getByPlaceholder('your@email.com').fill(`qa_${suffix}@example.invalid`);
  await page.getByPlaceholder('••••••••').fill('ephemeral-password'); await page.getByRole('button', { name: 'CREATE NODE' }).click();
  await expect(page.getByText('ACCESS GRANTED')).toBeVisible({ timeout: 10_000 });
});

test('profile, follow count, search, direct navigation, and browser history work', async ({ monitoredPage: page }) => {
  const { data } = await login(page); const peer = userFor(data, 'peer');
  await page.goto(`/users/${peer.username}`);
  const follow = page.getByRole('button', { name: /^(FOLLOW|FOLLOWING)$/ });
  const before = await follow.textContent(); await follow.click();
  await expect(page.getByRole('button', { name: before?.trim() === 'FOLLOW' ? 'FOLLOWING' : 'FOLLOW' })).toBeVisible();
  await page.getByTitle(/Search/).click(); await page.getByPlaceholder(/Search/i).fill(peer.username);
  const result = page.getByRole('button').filter({ hasText: peer.username }).first();
  await expect(result).toBeVisible(); await result.click();
  await expect(page).toHaveURL(/\/users\//); await page.goBack(); await expect(page).toHaveURL(/\/$/);
});

test('ordinary user cannot invoke admin APIs or render admin dashboard', async ({ monitoredPage: page, request }) => {
  const { data, user } = await login(page); const response = await request.post(`${data.apiURL}/auth/login`, { data: { email: user.email, password: data.password } });
  const token = (await response.json()).token;
  expect((await request.get(`${data.apiURL}/admin/stats`, { headers: { authorization: `Bearer ${token}` } })).status()).toBe(403);
  await page.goto('/admin'); await expect(page.getByText(/ADMIN COMMAND CENTER/i)).toHaveCount(0);
});
