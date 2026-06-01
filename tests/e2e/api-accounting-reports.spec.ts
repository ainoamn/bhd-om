import { test, expect } from '@playwright/test';
import { loginWithCredentials, resolveE2EAdminCredentials } from './helpers/auth';

const YEAR = new Date().getFullYear();
const FROM = `${YEAR}-01-01`;
const TO = new Date().toISOString().slice(0, 10);

test.describe('API — accounting reports (authenticated admin)', () => {
  test.beforeEach(async ({ page }) => {
    const creds = resolveE2EAdminCredentials();
    test.skip(!creds, 'Missing admin credentials');
    await loginWithCredentials(page, creds!);
  });

  test('GET /api/accounting/reports?report=trial returns trial balance shape', async ({ page }) => {
    const res = await page.request.get(
      `/api/accounting/reports?report=trial&fromDate=${FROM}&toDate=${TO}`
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.report).toBe('trial');
    expect(Array.isArray(body.data)).toBe(true);
    expect(typeof body.totalDebit).toBe('number');
    expect(typeof body.totalCredit).toBe('number');
  });

  test('GET /api/accounting/reports?report=income returns P&L shape', async ({ page }) => {
    const res = await page.request.get(
      `/api/accounting/reports?report=income&fromDate=${FROM}&toDate=${TO}`
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.report).toBe('income');
    expect(body.revenue).toBeTruthy();
    expect(body.expense).toBeTruthy();
    expect(typeof body.netIncome).toBe('number');
  });

  test('GET /api/accounting/reports?report=bankStatement returns ledger shape', async ({ page }) => {
    const res = await page.request.get(
      `/api/accounting/reports?report=bankStatement&bankAccountId=CASH&fromDate=${FROM}&toDate=${TO}`
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.report).toBe('bankStatement');
    expect(body.bankAccountId).toBe('CASH');
    expect(Array.isArray(body.lines)).toBe(true);
    expect(body.balance).toMatchObject({
      debit: expect.any(Number),
      credit: expect.any(Number),
      balance: expect.any(Number),
    });
  });

  test('GET /api/accounting/reports?report=propertyLedger without filters returns empty entries', async ({ page }) => {
    const res = await page.request.get(
      `/api/accounting/reports?report=propertyLedger&fromDate=${FROM}&toDate=${TO}`
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.report).toBe('propertyLedger');
    expect(Array.isArray(body.entries)).toBe(true);
    expect(body.entries.length).toBe(0);
    expect(body.totals.count).toBe(0);
  });

  test('GET /api/accounting/reports?report=vat returns VAT summary', async ({ page }) => {
    const res = await page.request.get(
      `/api/accounting/reports?report=vat&fromDate=${FROM}&toDate=${TO}`
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.summary).toBeTruthy();
    expect(typeof body.summary.netVatPayable).toBe('number');
    expect(Array.isArray(body.lines)).toBe(true);
  });

  test('unauthenticated GET /api/accounting/reports is rejected', async ({ request }) => {
    const res = await request.get(`/api/accounting/reports?report=trial&fromDate=${FROM}&toDate=${TO}`);
    expect(res.status()).toBeGreaterThanOrEqual(401);
  });
});
