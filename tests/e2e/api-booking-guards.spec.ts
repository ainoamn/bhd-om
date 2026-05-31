import { test, expect } from '@playwright/test';
import { e2eBrowserHeaders } from './helpers/auth';

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

  test('contracts PATCH requires authentication', async ({ request }) => {
    const res = await request.patch(`${baseURL}/api/contracts/CTR-TEST`, {
      data: { status: 'DRAFT' },
    });
    expect(res.status()).toBe(401);
  });

  test('payment initiate requires authentication', async ({ request }) => {
    const res = await request.post(`${baseURL}/api/bookings/payment/initiate`, {
      data: { amount: 100, propertyId: 1, payerEmail: 'a@b.c', payerName: 'Test' },
    });
    expect(res.status()).toBe(401);
  });

  test('payment complete requires authentication', async ({ request }) => {
    const res = await request.get(`${baseURL}/api/bookings/payment/complete?session_id=test-session`);
    expect(res.status()).toBe(401);
  });

  test('booking-documents GET requires authentication', async ({ request }) => {
    const res = await request.get(`${baseURL}/api/settings/booking-documents`);
    expect(res.status()).toBe(401);
  });

  test('booking-documents POST requires authentication', async ({ request }) => {
    const res = await request.post(`${baseURL}/api/settings/booking-documents`, {
      data: [],
    });
    expect(res.status()).toBe(401);
  });

  test('booking-checks GET requires authentication', async ({ request }) => {
    const res = await request.get(`${baseURL}/api/settings/booking-checks`);
    expect(res.status()).toBe(401);
  });

  test('booking-checks POST requires authentication', async ({ request }) => {
    const res = await request.post(`${baseURL}/api/settings/booking-checks`, {
      data: [],
    });
    expect(res.status()).toBe(401);
  });

  test('legacy booking settings admin GET requires authentication', async ({ request }) => {
    const res = await request.get(`${baseURL}/api/admin/legacy-booking-settings`);
    expect(res.status()).toBe(401);
  });

  test('legacy booking settings admin POST requires authentication', async ({ request }) => {
    const res = await request.post(`${baseURL}/api/admin/legacy-booking-settings`, {
      data: { action: 'backfill' },
    });
    expect(res.status()).toBe(401);
  });

  test('payment gateway status GET requires authentication', async ({ request }) => {
    const res = await request.get(`${baseURL}/api/admin/payment-gateway`);
    expect(res.status()).toBe(401);
  });

  test('public upload PATCH rejects missing fields', async ({ request }) => {
    const res = await request.patch(`${baseURL}/api/bookings/public-upload-access`, {
      headers: e2eBrowserHeaders(),
      data: { action: 'upload', bookingId: 'BKG-TEST' },
    });
    expect(res.status()).toBe(400);
  });

  test('public upload PATCH returns 404 for unknown booking', async ({ request }) => {
    const res = await request.patch(`${baseURL}/api/bookings/public-upload-access`, {
      headers: e2eBrowserHeaders(),
      data: {
        action: 'upload',
        bookingId: 'BKG-NO-SUCH',
        email: 'no-such-user@example.test',
        docId: 'BDOC-TEST',
        fileUrl: 'https://example.test/file.pdf',
        fileName: 'file.pdf',
      },
    });
    expect(res.status()).toBe(404);
  });

  test('public contract access rejects missing params', async ({ request }) => {
    const res = await request.get(`${baseURL}/api/bookings/public-contract-access`);
    expect(res.status()).toBe(400);
  });

  test('public contract access returns 404 for unknown booking', async ({ request }) => {
    const qs = new URLSearchParams({
      bookingId: 'BKG-NO-SUCH',
      email: 'no-such-user@example.test',
    });
    const res = await request.get(`${baseURL}/api/bookings/public-contract-access?${qs.toString()}`);
    expect(res.status()).toBe(404);
  });

  test('public receipt rejects missing bookingId', async ({ request }) => {
    const res = await request.get(`${baseURL}/api/bookings/public-receipt`);
    expect(res.status()).toBe(400);
  });

  test('public receipt returns 404 for unknown booking', async ({ request }) => {
    const qs = new URLSearchParams({ bookingId: 'BKG-NO-SUCH', propertyId: '1' });
    const res = await request.get(`${baseURL}/api/bookings/public-receipt?${qs.toString()}`);
    expect(res.status()).toBe(404);
  });

  test('public contract access PATCH rejects missing fields', async ({ request }) => {
    const res = await request.patch(`${baseURL}/api/bookings/public-contract-access`, {
      headers: e2eBrowserHeaders(),
      data: { action: 'saveChecks', bookingId: 'BKG-TEST' },
    });
    expect([400, 404]).toContain(res.status());
  });

  test('public contract access PATCH updateBooking returns 404 for unknown booking', async ({ request }) => {
    const res = await request.patch(`${baseURL}/api/bookings/public-contract-access`, {
      headers: e2eBrowserHeaders(),
      data: {
        action: 'updateBooking',
        bookingId: 'BKG-NO-SUCH',
        email: 'nobody@example.com',
        updates: { name: 'Test User' },
      },
    });
    expect(res.status()).toBe(404);
  });

  test('public contract access PATCH syncContact returns 404 for unknown booking', async ({ request }) => {
    const res = await request.patch(`${baseURL}/api/bookings/public-contract-access`, {
      headers: e2eBrowserHeaders(),
      data: {
        action: 'syncContact',
        bookingId: 'BKG-NO-SUCH',
        email: 'nobody@example.com',
        contactId: 'CNT-TEST',
        contact: { firstName: 'Test', familyName: 'User', phone: '+96891234567' },
      },
    });
    expect(res.status()).toBe(404);
  });

  test('thawani webhook rejects invalid secret when configured', async ({ request }) => {
    test.skip(!process.env.THAWANI_WEBHOOK_SECRET, 'Requires THAWANI_WEBHOOK_SECRET');
    const res = await request.post(`${baseURL}/api/webhooks/thawani`, {
      data: { event_type: 'checkout.completed', data: { session_id: 'test' } },
      headers: { 'x-webhook-secret': 'wrong-secret' },
    });
    expect(res.status()).toBe(401);
  });

  test('thawani webhook rejects missing session_id', async ({ request }) => {
    const res = await request.post(`${baseURL}/api/webhooks/thawani`, {
      data: { event_type: 'checkout.completed' },
    });
    expect(res.status()).toBe(400);
  });

  test('linked-contact GET requires authentication', async ({ request }) => {
    const res = await request.get(`${baseURL}/api/user/linked-contact`);
    expect(res.status()).toBe(401);
  });

  test('linked-contact PATCH requires authentication', async ({ request }) => {
    const res = await request.patch(`${baseURL}/api/user/linked-contact`, {
      data: { firstName: 'Test' },
    });
    expect(res.status()).toBe(401);
  });

  test('me accounting-documents GET requires authentication', async ({ request }) => {
    const res = await request.get(`${baseURL}/api/me/accounting-documents`);
    expect(res.status()).toBe(401);
  });

  test('address-book GET requires authentication', async ({ request }) => {
    const res = await request.get(`${baseURL}/api/address-book?limit=1&offset=0`);
    expect(res.status()).toBe(401);
  });

  test('debug-auth is blocked in production', async ({ request }) => {
    test.skip(process.env.NODE_ENV !== 'production', 'Production-only assertion');
    const res = await request.get(`${baseURL}/api/debug-auth`);
    expect(res.status()).toBe(404);
  });
});
