import { test, expect } from '@playwright/test';
import { loginWithCredentials, resolveE2EAdminCredentials } from './helpers/auth';

const ACCOUNTING_TABS = ['dashboard', 'sales', 'purchases', 'journal', 'documents', 'reports', 'accounts', 'claims', 'cheques', 'payments', 'periods', 'audit', 'settings'] as const;

test.describe('Accounting hub UI', () => {
  test.beforeEach(async ({ page }) => {
    const creds = resolveE2EAdminCredentials();
    test.skip(!creds, 'Missing admin credentials');
    await loginWithCredentials(page, creds!);
  });

  test('loads without generic server error', async ({ page }) => {
    await page.goto('/ar/admin/accounting');
    await expect(page.getByTestId('accounting-hub')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('heading', { name: /المحاسبة|Accounting/i })).toBeVisible();
    await expect(page.getByText('حدث خطأ', { exact: true })).not.toBeVisible();
    await expect(page.getByText(/An error occurred in the Server Components render/i)).not.toBeVisible();
  });

  test('tab routes render without crash', async ({ page }) => {
    for (const tab of ACCOUNTING_TABS) {
      await page.goto(`/ar/admin/accounting?tab=${tab}`);
      await expect(page.getByTestId('accounting-hub')).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText('حدث خطأ', { exact: true })).not.toBeVisible();
      await expect(page).toHaveURL(new RegExp(`tab=${tab}`));
    }
  });

  test('reports sub-view loads via query', async ({ page }) => {
    await page.goto('/ar/admin/accounting?tab=reports&report=trial');
    await expect(page.getByTestId('accounting-hub')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/ميزان المراجعة|Trial Balance/i)).toBeVisible();
  });

  test('add modals open from URL action with draft notice', async ({ page }) => {
    await page.goto('/ar/admin/accounting?tab=documents&action=add');
    await expect(page.getByTestId('accounting-modal-document')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/لن تظهر في النظام إلا بعد الحفظ|only after save/i)).toBeVisible();

    await page.goto('/ar/admin/accounting?tab=journal&action=add');
    await expect(page.getByTestId('accounting-modal-journal')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/لن تظهر في النظام إلا بعد الحفظ|only after save/i)).toBeVisible();

    await page.goto('/ar/admin/accounting?tab=accounts&action=add');
    await expect(page.getByTestId('accounting-modal-account')).toBeVisible({ timeout: 30_000 });
  });
});
