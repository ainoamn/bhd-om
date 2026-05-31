import { test, expect } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';

test.describe('Public booking pages smoke', () => {
  test('upload-documents page renders verify form', async ({ page }) => {
    await page.goto(`${baseURL}/ar/properties/1/upload-documents`);
    await expect(page.locator('body')).toBeVisible();
    await expect(page.getByText(/تأكيد هويتك|Verify your identity/i)).toBeVisible();
  });

  test('properties listing is reachable', async ({ page }) => {
    await page.goto(`${baseURL}/ar/properties`);
    await expect(page).toHaveURL(/\/properties/);
    await expect(page.locator('body')).toBeVisible();
  });
});
