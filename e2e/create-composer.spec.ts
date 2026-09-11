import { test, expect, login } from './fixtures';

test('CREATE opens the post composer with text publishing available', async ({ monitoredPage: page }) => {
  await login(page);

  await page.getByRole('button', { name: 'CREATE', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'CREATE POST' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'TEXT', exact: true })).toBeVisible();
  await expect(page.getByText('INJECTION_PORT_V2')).toHaveCount(0);
});
