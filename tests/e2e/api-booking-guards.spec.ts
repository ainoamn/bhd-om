import { test, expect } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';

test.describe('API guards — booking & contract path', () => {
  test('public upload access rejects missing params', async ({ request }) => {
    const res = await request.get(`${baseURL}/api/bookings/public-upload-access`);
    expect(res.status()).toBe(400);
  });

  test('public upload access returns 404 for unknown booking', async ({ request }) => {
    const qs = new URLSearchParams({
      propertyId: '999999',
      email: 'no-such-user@example.test',
    });
    const res = await request.get(`${baseURL}/api/bookings/public-upload-access?${qs.toString()}`);
    expect(res.status()).toBe(404);
  });

  test('contracts POST requires authentication', async ({ request }) => {
    const res = await request.post(`${baseURL}/api/contracts`, {
      data: { id: 'CTR-TEST', bookingId: 'BKG-TEST', status: 'DRAFT' },
    });
    expect(res.status()).toBe(401);
  });

  test('bookings GET requires authentication', async ({ request }) => {
    const res = await request.get(`${baseURL}/api/bookings?limit=1&offset=0`);
    expect(res.status()).toBe(401);
  });

  test('contracts GET requires authentication', async ({ request }) => {
    const res = await request.get(`${baseURL}/api/contracts?limit=1&offset=0`);
    expect(res.status()).toBe(401);
  });

  test('payment initiate requires authentication', async ({ request }) => {
    const res = await request.post(`${baseURL}/api/bookings/payment/initiate`, {
      data: { amount: 100, propertyId: 1, payerEmail: 'a@b.c', payerName: 'Test' },
    });
    expect(res.status()).toBe(401);
  });

  test('debug-auth is blocked in production', async ({ request }) => {
    test.skip(process.env.NODE_ENV !== 'production', 'Production-only assertion');
    const res = await request.get(`${baseURL}/api/debug-auth`);
    expect(res.status()).toBe(404);
  });
});
