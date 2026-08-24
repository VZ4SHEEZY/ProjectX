import { test as base, expect, Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

type RuntimeUser = { id: string; role: string; username: string; email: string };
export type Runtime = { runId: string; password: string; users: RuntimeUser[]; postId: string; apiURL: string; qaSecret: string };
export const runtime = async (): Promise<Runtime> => JSON.parse(await readFile('.e2e/runtime.json', 'utf8'));
export const userFor = (data: Runtime, role: string) => data.users.find(user => user.role === role)!;

export async function login(page: Page, role = 'primary') {
  const data = await runtime(); const user = userFor(data, role);
  await page.goto('/');
  await page.getByPlaceholder('your@email.com').fill(user.email);
  await page.getByPlaceholder('••••••••').fill(data.password);
  await page.getByRole('button', { name: 'ESTABLISH LINK' }).click();
  await expect(page.getByText('CYBER//DOPE', { exact: true }).first()).toBeVisible({ timeout: 10_000 });
  return { data, user };
}

export const test = base.extend<{ monitoredPage: Page }>({
  monitoredPage: async ({ page }, use) => {
    const failures: string[] = [];
    page.on('pageerror', error => failures.push(`runtime: ${error.message}`));
    page.on('console', message => {
      if (message.type() !== 'error') return;
      const text = message.text();
      if (/favicon|net::ERR_ABORTED|Failed to load resource/.test(text)) return;
      failures.push(`console: ${text}`);
    });
    page.on('response', response => { if (response.status() >= 500) failures.push(`HTTP ${response.status()} ${new URL(response.url()).pathname}`); });
    await use(page);
    expect(failures, failures.join('\n')).toEqual([]);
  }
});
export { expect };
