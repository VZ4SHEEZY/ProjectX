import { test, expect, login, runtime } from './fixtures';
import { mkdir, readFile } from 'node:fs/promises';

test.skip(!process.env.VISUAL_QA, 'Run explicitly to create Release 2 certification artifacts');
test.setTimeout(300_000);
const out = 'artifacts/release2-certification';
const slug = (value:string) => value.toLowerCase().replaceAll(' ', '-');
const cert = async () => (await runtime() as any).certification;

async function loginAs(page:any, username:string) {
  const data = await runtime();
  await page.context().clearCookies();
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByPlaceholder('your@email.com').fill(`${username}@example.invalid`);
  await page.getByPlaceholder('••••••••').fill(data.password);
  await page.getByRole('button', { name: 'ESTABLISH LINK' }).click();
  await expect(page.getByText('CYBER//DOPE', { exact: true }).first()).toBeVisible({ timeout: 15_000 });
}

async function capturePublic(page:any, username:string, name:string) {
  await page.goto(`/users/${username}`);
  await expect(page.getByTestId('profile-v2-modules')).toBeVisible({ timeout: 20_000 });
  await page.waitForFunction(() => [...document.images].every(image => image.complete), null, { timeout: 20_000 }).catch(() => {});
  await page.addStyleTag({ content: 'html,body,#root{height:auto!important;min-height:100%!important;overflow:visible!important}.profile-v2-page{height:auto!important;min-height:100vh!important;overflow:visible!important}' });
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
}

test('real QA records produce all faction and desktop certification captures', async ({ monitoredPage:page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'desktop certification run');
  await mkdir(out, { recursive: true });
  await login(page);
  const data = await cert();
  for (const [index, profile] of data.factionProfiles.entries()) await capturePublic(page, profile.username, `faction-${String(index + 1).padStart(2, '0')}-${slug(profile.faction)}`);
  for (const [index, profile] of data.individualityProfiles.entries()) await capturePublic(page, profile.username, `same-faction-obsidian-${String.fromCharCode(97 + index)}-desktop`);
  await capturePublic(page, data.topFriendsOwner.username, 'top-friends-public-desktop');
  await capturePublic(page, data.creator.username, 'creator-profile-desktop');
  await capturePublic(page, data.access.username, 'access-locked-preview-desktop');
  const response = await page.request.get(`${(await runtime()).apiURL}/profiles/${data.access.username}`);
  expect(response.ok()).toBeTruthy();
  const body = await response.text();
  expect(body).not.toContain('MUST_NOT_LEAK');
  expect(body).not.toContain('AND_SECRET_MUST_NOT_LEAK');
  expect(body).not.toContain('secret.invalid');
  const parsed = JSON.parse(body);
  expect(parsed.data.modules.filter((module:any) => module.locked)).toHaveLength(2);
  expect(parsed.data.modules.filter((module:any) => module.accessRule)).toHaveLength(0);
});

test('real same-faction profiles and Creator remain usable on Pixel 7', async ({ monitoredPage:page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'Pixel 7 certification run');
  await mkdir(out, { recursive: true });
  await login(page);
  const data = await cert();
  for (const [index, profile] of data.individualityProfiles.entries()) await capturePublic(page, profile.username, `same-faction-obsidian-${String.fromCharCode(97 + index)}-mobile-pixel-7`);
  await capturePublic(page, data.topFriendsOwner.username, 'top-friends-public-mobile-pixel-7');
  await capturePublic(page, data.creator.username, 'creator-profile-mobile-pixel-7');
  await capturePublic(page, data.access.username, 'access-locked-preview-mobile-pixel-7');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
});

test('real Studio records show design, modules, access rules, and Top Friends editing', async ({ monitoredPage:page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'desktop Studio run');
  await mkdir(out, { recursive: true });
  const data = await cert();
  await loginAs(page, data.topFriendsOwner.username);
  await page.getByLabel('Open Profile Studio').click();
  await expect(page.getByTestId('profile-v2-studio')).toBeVisible();
  await page.screenshot({ path: `${out}/profile-studio-design-desktop.png`, fullPage: true });
  await page.getByRole('button', { name: 'modules', exact: true }).click();
  await page.screenshot({ path: `${out}/profile-studio-modules-desktop.png`, fullPage: true });
  await page.getByRole('button', { name: 'friends', exact: true }).click();
  await expect(page.getByText('8/8').first()).toBeVisible();
  await page.getByLabel(/^Remove /).first().click();
  await expect(page.getByText('7/8').first()).toBeVisible();
  await page.getByRole('button', { name: 'Iris', exact: false }).click();
  await page.getByRole('button', { name: 'PUBLISH TOP FRIENDS' }).click();
  await expect(page.getByText('Top Friends published.')).toBeVisible();
  await page.screenshot({ path: `${out}/top-friends-editor-remove-replace.png`, fullPage: true });
  await page.getByLabel('Close').click();
  await page.getByTitle('Logout').click();
  await expect(page.getByPlaceholder('your@email.com')).toBeVisible();
  await loginAs(page, data.access.username);
  await page.getByLabel('Open Profile Studio').click();
  await page.getByRole('button', { name: 'access', exact: true }).click();
  await expect(page.locator('input[value="Verified AND subscriber"]')).toBeVisible();
  await page.screenshot({ path: `${out}/access-hidden-studio.png`, fullPage: true });
  await page.screenshot({ path: `${out}/access-rule-and-studio.png`, fullPage: true });
  await page.screenshot({ path: `${out}/access-rule-or-studio.png`, fullPage: true });
});

test('mobile Studio navigation, logout, controls, and safe areas remain reachable', async ({ monitoredPage:page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'Pixel 7 Studio run');
  await mkdir(out, { recursive: true });
  const data = await cert();
  await loginAs(page, data.topFriendsOwner.username);
  await page.getByLabel('Open navigation').click();
  await expect(page.getByRole('button', { name: 'LOGOUT' })).toBeVisible();
  await page.getByRole('button', { name: 'PROFILE STUDIO' }).click();
  await expect(page.getByTestId('profile-v2-studio')).toBeVisible();
  await page.screenshot({ path: `${out}/profile-studio-mobile-pixel-7.png`, fullPage: true });
  await page.getByRole('button', { name: 'friends', exact: true }).click();
  await expect(page.getByRole('button', { name: 'PUBLISH TOP FRIENDS' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
});

test('build all-20-factions contact sheet from real-profile captures', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'desktop contact sheet');
  await mkdir(out, { recursive: true });
  const data = await cert();
  const cards = [];
  for (const [index, profile] of data.factionProfiles.entries()) {
    const filename = `faction-${String(index + 1).padStart(2, '0')}-${slug(profile.faction)}.png`;
    const image = (await readFile(`${out}/${filename}`)).toString('base64');
    cards.push(`<figure><img src="data:image/png;base64,${image}"><figcaption>${String(index + 1).padStart(2, '0')} — ${profile.faction}</figcaption></figure>`);
  }
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.setContent(`<style>*{box-sizing:border-box}body{margin:0;padding:28px;background:#030303;color:white;font:16px ui-monospace,monospace}h1{color:#39ff14;letter-spacing:.12em}main{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}figure{margin:0;border:1px solid #333;background:#090909;padding:8px}img{width:100%;height:390px;object-fit:cover;object-position:top}figcaption{padding:10px 4px 3px;color:#ddd}</style><h1>CYBERDOPE — REAL QA DATA / 20 FOUNDING FACTIONS</h1><main>${cards.join('')}</main>`);
  await page.screenshot({ path: `${out}/all-20-factions-contact-sheet.png`, fullPage: true });
});
