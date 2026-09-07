import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

type Case = { name: string; userId: string; expectedStatus: number; expectedProjectionState?: 'available' | 'unavailable'; expectedFreshness?: 'current' | 'stale' | 'unavailable' };
type Manifest = { baseURL: string; bearerToken: string; cases: Case[]; profilePaths?: string[] };

test.describe('Release 3E production-shaped staging smoke', () => {
  test.skip(!process.env.PROGRESSION_SMOKE_MANIFEST, 'Set PROGRESSION_SMOKE_MANIFEST to an approved staging identity manifest; this test never creates users.');

  test('privacy, affiliation, creator, levels, and freshness matrix', async ({ request }) => {
    const manifest: Manifest = JSON.parse(await readFile(process.env.PROGRESSION_SMOKE_MANIFEST!, 'utf8'));
    for (const entry of manifest.cases) {
      const response = await request.get(`${manifest.baseURL}/api/progression/users/${entry.userId}`, { headers: { Authorization: `Bearer ${manifest.bearerToken}` } });
      expect(response.status(), entry.name).toBe(entry.expectedStatus);
      if (entry.expectedStatus === 200) {
        const body = await response.json();
        expect(body.data.projectionState, entry.name).toBe(entry.expectedProjectionState);
        expect(body.data.freshness.state, entry.name).toBe(entry.expectedFreshness);
        const serialized = JSON.stringify(body);
        for (const privateField of ['policyArtifact', 'producer', 'evidence', 'qualification', 'allegiance', 'platformRole']) expect(serialized).not.toContain(privateField);
      }
    }
  });

  test('approved profile paths render on desktop and mobile projects', async ({ page }) => {
    const manifest: Manifest = JSON.parse(await readFile(process.env.PROGRESSION_SMOKE_MANIFEST!, 'utf8'));
    for (const path of manifest.profilePaths || []) {
      await page.goto(new URL(path, manifest.baseURL).toString());
      await expect(page.locator('body')).toBeVisible();
      await expect(page.locator('[data-testid="progression-panel"], text=Progression signal').first()).toBeVisible();
    }
  });
});
