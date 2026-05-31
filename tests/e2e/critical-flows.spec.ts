import { test, expect } from '@playwright/test';
import { loginWithCredentials, resolveE2EAdminCredentials } from './helpers/auth';

const hasResetCreds =
  !!process.env.E2E_ADMIN_EMAIL &&
  !!process.env.E2E_ADMIN_PASSWORD &&
  !!process.env.E2E_SECURITY_PIN;

type RoleCred = {
  email?: string;
  password?: string;
  landingPath: string;
};

test.describe('Critical DB-first flows', () => {
  test('reset flow logs out deleted session user', async ({ page }) => {
    test.skip(
      !hasResetCreds || process.env.E2E_ALLOW_DB_RESET !== 'true',
      'Set E2E_ALLOW_DB_RESET=true and E2E_SECURITY_PIN to run destructive DB reset test'
    );

    const creds = resolveE2EAdminCredentials();
    if (!creds) test.skip();
    await loginWithCredentials(page, creds!);
    await page.goto('/ar/admin/data');
    await page.getByPlaceholder(/رمز الحماية|security pin/i).fill(process.env.E2E_SECURITY_PIN || '');
    await page.getByRole('button', { name: /بدء تصفير قاعدة البيانات|start database reset/i }).click();
    await page.getByRole('button', { name: /تأكيد تصفير الخادم|confirm server reset/i }).click();

    await expect(page).toHaveURL(/\/(ar|en)\/login|\/login/i);

    await page.goto('/ar/admin/my-bookings');
    await expect(page).toHaveURL(/\/(ar|en)\/login|\/login/i);
    await page.goto('/ar/admin/my-account');
    await expect(page).toHaveURL(/\/(ar|en)\/login|\/login/i);
  });

  test('admin bookings and contracts pages load', async ({ page }) => {
    const creds = resolveE2EAdminCredentials();
    test.skip(!creds, 'Missing E2E admin credentials');

    await loginWithCredentials(page, creds!);
    await page.goto('/ar/admin/bookings');
    await expect(page).toHaveURL(/\/admin\/bookings/);
    await page.goto('/ar/admin/contracts');
    await expect(page).toHaveURL(/\/admin\/contracts/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('admin address-book and data pages load', async ({ page }) => {
    const creds = resolveE2EAdminCredentials();
    test.skip(!creds, 'Missing E2E admin credentials');

    await loginWithCredentials(page, creds!);
    await page.goto('/ar/admin/address-book');
    await expect(page).toHaveURL(/\/admin\/address-book/);
    await page.goto('/ar/admin/data');
    await expect(page).toHaveURL(/\/admin\/data/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('my-account page loads and linked-contact API responds', async ({ page }) => {
    const creds = resolveE2EAdminCredentials();
    test.skip(!creds, 'Missing E2E admin credentials');

    await loginWithCredentials(page, creds!);
    const apiRes = await page.request.get('/api/user/linked-contact');
    expect(apiRes.ok()).toBeTruthy();

    await page.goto('/ar/admin/my-account');
    await expect(page).toHaveURL(/\/admin\/my-account/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('role-based routes load for available credentials', async ({ page }) => {
    const roles: RoleCred[] = [
      {
        email: process.env.E2E_ADMIN_EMAIL || resolveE2EAdminCredentials()?.email,
        password: process.env.E2E_ADMIN_PASSWORD || resolveE2EAdminCredentials()?.password,
        landingPath: '/ar/admin',
      },
      {
        email: process.env.E2E_ACCOUNTANT_EMAIL,
        password: process.env.E2E_ACCOUNTANT_PASSWORD,
        landingPath: '/ar/admin/accounting',
      },
      {
        email: process.env.E2E_OWNER_EMAIL,
        password: process.env.E2E_OWNER_PASSWORD,
        landingPath: '/ar/admin/my-properties',
      },
      {
        email: process.env.E2E_CLIENT_EMAIL,
        password: process.env.E2E_CLIENT_PASSWORD,
        landingPath: '/ar/admin/my-bookings',
      },
    ];

    const runnable = roles.filter((r) => r.email && r.password);
    test.skip(runnable.length === 0, 'Missing role credentials env vars');

    for (const role of runnable) {
      await page.context().clearCookies();
      await page.goto('/ar');
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await loginWithCredentials(page, { email: role.email!, password: role.password! });
      await page.goto(role.landingPath);
      await expect(page).toHaveURL(new RegExp(role.landingPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('legacy booking settings API returns status for admin', async ({ page }) => {
    const creds = resolveE2EAdminCredentials();
    test.skip(!creds, 'Missing E2E admin credentials');

    await loginWithCredentials(page, creds!);
    const res = await page.request.get('/api/admin/legacy-booking-settings');
    expect(res.ok()).toBeTruthy();
    const data = (await res.json()) as { tableDocumentCount?: number; fullyMigrated?: boolean };
    expect(typeof data.tableDocumentCount).toBe('number');
    expect(typeof data.fullyMigrated).toBe('boolean');
  });
});
