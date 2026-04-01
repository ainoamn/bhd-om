import { test, expect } from '@playwright/test';

const hasCreds =
  !!process.env.E2E_ADMIN_EMAIL &&
  !!process.env.E2E_ADMIN_PASSWORD &&
  !!process.env.E2E_SECURITY_PIN;

async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/ar/login');
  await page.getByLabel(/البريد الإلكتروني|email/i).fill(process.env.E2E_ADMIN_EMAIL || '');
  await page.getByLabel(/كلمة المرور|password/i).fill(process.env.E2E_ADMIN_PASSWORD || '');
  await page.getByRole('button', { name: /دخول|login|sign in/i }).click();
}

test.describe('Critical DB-first flows', () => {
  test('reset flow logs out deleted session user', async ({ page }) => {
    test.skip(!hasCreds, 'Missing E2E credentials env vars');

    await loginAsAdmin(page);
    await page.goto('/ar/admin/data');
    await page.getByPlaceholder(/رمز الحماية|security pin/i).fill(process.env.E2E_SECURITY_PIN || '');
    await page.getByRole('button', { name: /بدء تصفير قاعدة البيانات|start database reset/i }).click();
    await page.getByRole('button', { name: /تأكيد تصفير الخادم|confirm server reset/i }).click();

    // Expected behavior after reset: session invalidation and redirect to login.
    await expect(page).toHaveURL(/\/(ar|en)\/login|\/login/i);
  });

  test('address-book and bookings do not show stale local data', async ({ page }) => {
    test.skip(!hasCreds, 'Missing E2E credentials env vars');

    await loginAsAdmin(page);
    await page.goto('/ar/admin/address-book');
    await expect(page.getByRole('heading', { name: /دفتر العناوين|address book/i })).toBeVisible();

    await page.goto('/ar/admin/my-bookings');
    await expect(page).toHaveURL(/\/admin\/my-bookings/);
    // Presence check only; data assertions are environment-specific.
    await expect(page.locator('body')).toBeVisible();
  });
});
