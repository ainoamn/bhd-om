import { test, expect } from '@playwright/test';

const hasAdmin =
  !!process.env.E2E_ADMIN_EMAIL &&
  !!process.env.E2E_ADMIN_PASSWORD;

async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/ar/login');
  await page.getByLabel(/البريد الإلكتروني|email/i).fill(process.env.E2E_ADMIN_EMAIL || '');
  await page.getByLabel(/كلمة المرور|password/i).fill(process.env.E2E_ADMIN_PASSWORD || '');
  await page.getByRole('button', { name: /دخول|login|sign in/i }).click();
}

test.describe('Heavy admin pages — navigation timing (smoke)', () => {
  test('measure load + API request count for key routes', async ({ page }) => {
    test.skip(!hasAdmin, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to record perf metrics');

    const apiPaths: string[] = [];
    page.on('request', (req) => {
      const u = req.url();
      if (u.includes('/api/')) apiPaths.push(new URL(u).pathname);
    });

    await loginAsAdmin(page);

    const routes = [
      '/ar/admin/address-book',
      '/ar/admin/bookings',
      '/ar/admin/contracts',
      '/ar/admin/properties',
    ] as const;

    const rows: { route: string; ms: number; apiCalls: number; uniqueApi: string[] }[] = [];

    for (const route of routes) {
      apiPaths.length = 0;
      const t0 = Date.now();
      await page.goto(route, { waitUntil: 'networkidle', timeout: 90_000 });
      const ms = Date.now() - t0;
      const uniqueApi = [...new Set(apiPaths.filter((p) => p.startsWith('/api/')))].sort();
      rows.push({ route, ms, apiCalls: apiPaths.length, uniqueApi });
      await expect(page.locator('body')).toBeVisible();
    }

    console.log('[perf-navigation]', JSON.stringify(rows, null, 2));

    for (const r of rows) {
      expect(r.ms).toBeLessThan(120_000);
    }
  });
});
