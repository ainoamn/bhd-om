import { test, expect } from '@playwright/test';
import {
  buildE2EBookingIdentity,
  e2eBrowserHeaders,
  loginWithCredentials,
  resolveE2EAdminCredentials,
} from './helpers/auth';

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';

function thawaniWebhookHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const secret = (process.env.THAWANI_WEBHOOK_SECRET || '').trim();
  if (secret) headers['x-webhook-secret'] = secret;
  return headers;
}

test.describe('Booking happy path (mock payment → server → public contract)', () => {
  test('creates paid booking and updates via public contract access', async ({ page }) => {
    const creds = resolveE2EAdminCredentials();
    test.skip(!creds, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD (or run locally with seeded admin)');

    await loginWithCredentials(page, creds!);

    const ts = Date.now();
    const identity = buildE2EBookingIdentity(ts);
    const propertyId = Number(process.env.E2E_PROPERTY_ID || 1);
    const depositAmount = 50;

    const payRes = await page.request.post('/api/bookings/payment/initiate', {
      data: {
        amount: depositAmount,
        propertyId,
        unitKey: identity.unitKey,
        payerEmail: identity.email,
        payerName: 'E2E Test Tenant',
        bookingType: 'BOOKING',
        locale: 'ar',
      },
    });
    expect(payRes.ok()).toBeTruthy();
    const payData = (await payRes.json()) as {
      provider?: string;
      paymentReferenceNo?: string;
      paymentDate?: string;
      redirectUrl?: string;
    };
    expect(payData.provider).toBe('mock');
    expect(payData.redirectUrl).toBeFalsy();
    expect(payData.paymentReferenceNo).toMatch(/^PAY-/);

    const bookingPayload = {
      id: identity.bookingId,
      propertyId,
      unitKey: identity.unitKey,
      propertyTitleAr: 'عقار اختبار E2E',
      propertyTitleEn: 'E2E Test Property',
      name: 'مستأجر E2E',
      email: identity.email,
      phone: identity.phone,
      type: 'BOOKING',
      status: 'PENDING',
      paymentConfirmed: true,
      paymentReferenceNo: payData.paymentReferenceNo,
      paymentDate: payData.paymentDate || new Date().toISOString(),
      priceAtBooking: depositAmount,
      paymentMethod: 'BANK_TRANSFER',
    };

    const bookRes = await page.request.post('/api/bookings', { data: bookingPayload });
    expect(bookRes.ok()).toBeTruthy();
    const bookData = (await bookRes.json()) as { ok?: boolean; id?: string; bookingSerial?: string };
    expect(bookData.ok).toBe(true);
    expect(bookData.id).toBe(identity.bookingId);
    expect(bookData.bookingSerial).toMatch(/BKG-/);

    const bundleQs = new URLSearchParams({
      bookingId: identity.bookingId,
      email: identity.email,
      propertyId: String(propertyId),
    });
    const bundleRes = await page.request.get(
      `/api/bookings/public-contract-access?${bundleQs.toString()}`
    );
    expect(bundleRes.ok()).toBeTruthy();
    const bundle = (await bundleRes.json()) as {
      bookings?: { id?: string; email?: string; paymentConfirmed?: boolean }[];
    };
    expect(bundle.bookings?.length).toBeGreaterThan(0);
    expect(bundle.bookings?.[0]?.id).toBe(identity.bookingId);
    expect(bundle.bookings?.[0]?.paymentConfirmed).toBe(true);

    const updatedName = 'مستأجر E2E محدّث';
    const patchRes = await page.request.patch('/api/bookings/public-contract-access', {
      headers: e2eBrowserHeaders(),
      data: {
        action: 'updateBooking',
        bookingId: identity.bookingId,
        email: identity.email,
        updates: { name: updatedName },
      },
    });
    expect(patchRes.ok()).toBeTruthy();

    const bundleAfter = await page.request.get(
      `/api/bookings/public-contract-access?${bundleQs.toString()}`
    );
    expect(bundleAfter.ok()).toBeTruthy();
    const bundle2 = (await bundleAfter.json()) as { bookings?: { name?: string }[] };
    expect(bundle2.bookings?.[0]?.name).toBe(updatedName);

    await page.goto(
      `/ar/properties/${propertyId}/contract-terms?bookingId=${identity.bookingId}&email=${encodeURIComponent(identity.email)}`
    );
    await expect(page.locator('body')).toBeVisible();
  });

  test('completes mock payment via payment/complete (Thawani-like flow)', async ({ page }) => {
    const creds = resolveE2EAdminCredentials();
    test.skip(!creds, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD (or run locally with seeded admin)');

    await loginWithCredentials(page, creds!);

    const ts = Date.now();
    const identity = buildE2EBookingIdentity(ts);
    const propertyId = Number(process.env.E2E_PROPERTY_ID || 1);
    const depositAmount = 50;

    const pendingBooking = {
      id: identity.bookingId,
      propertyId,
      unitKey: identity.unitKey,
      propertyTitleAr: 'عقار E2E complete',
      propertyTitleEn: 'E2E Complete Property',
      name: 'مستأجر E2E Complete',
      email: identity.email,
      phone: identity.phone,
      type: 'BOOKING',
      status: 'PENDING',
      priceAtBooking: depositAmount,
    };

    const payRes = await page.request.post('/api/bookings/payment/initiate', {
      data: {
        amount: depositAmount,
        propertyId,
        unitKey: identity.unitKey,
        payerEmail: identity.email,
        payerName: 'E2E Complete Tenant',
        bookingType: 'BOOKING',
        locale: 'ar',
        pendingBooking,
      },
    });
    expect(payRes.ok()).toBeTruthy();
    const payData = (await payRes.json()) as { paymentReferenceNo?: string; provider?: string };
    expect(payData.provider).toBe('mock');
    const sessionId = payData.paymentReferenceNo || '';
    expect(sessionId).toMatch(/^PAY-/);

    const completeRes = await page.request.get(
      `/api/bookings/payment/complete?session_id=${encodeURIComponent(sessionId)}`
    );
    expect(completeRes.ok()).toBeTruthy();
    const completeData = (await completeRes.json()) as { bookingId?: string; propertyId?: number };
    expect(completeData.bookingId).toBe(identity.bookingId);
    expect(completeData.propertyId).toBe(propertyId);

    const bundleQs = new URLSearchParams({
      bookingId: identity.bookingId,
      email: identity.email,
    });
    const bundleRes = await page.request.get(
      `/api/bookings/public-contract-access?${bundleQs.toString()}`
    );
    expect(bundleRes.ok()).toBeTruthy();
    const bundle = (await bundleRes.json()) as { bookings?: { paymentConfirmed?: boolean }[] };
    expect(bundle.bookings?.[0]?.paymentConfirmed).toBe(true);
  });

  test('payment success page confirms mock session and redirects to receipt', async ({ page }) => {
    const creds = resolveE2EAdminCredentials();
    test.skip(!creds, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD (or run locally with seeded admin)');

    await loginWithCredentials(page, creds!);

    const ts = Date.now();
    const identity = buildE2EBookingIdentity(ts);
    const propertyId = Number(process.env.E2E_PROPERTY_ID || 1);
    const depositAmount = 50;

    const pendingBooking = {
      id: identity.bookingId,
      propertyId,
      unitKey: identity.unitKey,
      propertyTitleAr: 'عقار E2E success page',
      propertyTitleEn: 'E2E Success Page Property',
      name: 'مستأجر E2E Success',
      email: identity.email,
      phone: identity.phone,
      type: 'BOOKING',
      status: 'PENDING',
      priceAtBooking: depositAmount,
    };

    const payRes = await page.request.post('/api/bookings/payment/initiate', {
      data: {
        amount: depositAmount,
        propertyId,
        unitKey: identity.unitKey,
        payerEmail: identity.email,
        payerName: 'E2E Success Tenant',
        bookingType: 'BOOKING',
        locale: 'ar',
        pendingBooking,
      },
    });
    expect(payRes.ok()).toBeTruthy();
    const payData = (await payRes.json()) as { paymentReferenceNo?: string };
    const sessionId = payData.paymentReferenceNo || '';
    expect(sessionId).toMatch(/^PAY-/);

    await page.goto(`/ar/payment/success?session_id=${encodeURIComponent(sessionId)}`);
    await expect(page.getByText(/تم الدفع بنجاح|Payment successful/i)).toBeVisible({ timeout: 20_000 });
    await expect(page).toHaveURL(new RegExp(`/properties/${propertyId}/receipt\\?booking=`), {
      timeout: 20_000,
    });
  });

  test('thawani webhook completes pending payment and creates booking', async ({ page, request }) => {
    const creds = resolveE2EAdminCredentials();
    test.skip(!creds, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD (or run locally with seeded admin)');

    await loginWithCredentials(page, creds!);

    const ts = Date.now();
    const identity = buildE2EBookingIdentity(ts);
    const propertyId = Number(process.env.E2E_PROPERTY_ID || 1);
    const depositAmount = 50;

    const pendingBooking = {
      id: identity.bookingId,
      propertyId,
      unitKey: identity.unitKey,
      propertyTitleAr: 'عقار E2E webhook',
      propertyTitleEn: 'E2E Webhook Property',
      name: 'مستأجر E2E Webhook',
      email: identity.email,
      phone: identity.phone,
      type: 'BOOKING',
      status: 'PENDING',
      priceAtBooking: depositAmount,
    };

    const payRes = await page.request.post('/api/bookings/payment/initiate', {
      data: {
        amount: depositAmount,
        propertyId,
        unitKey: identity.unitKey,
        payerEmail: identity.email,
        payerName: 'E2E Webhook Tenant',
        bookingType: 'BOOKING',
        locale: 'ar',
        pendingBooking,
      },
    });
    expect(payRes.ok()).toBeTruthy();
    const payData = (await payRes.json()) as { paymentReferenceNo?: string };
    const sessionId = payData.paymentReferenceNo || '';
    expect(sessionId).toMatch(/^PAY-/);

    const webhookRes = await request.post(`${baseURL}/api/webhooks/thawani`, {
      data: {
        event_type: 'checkout.completed',
        data: { session_id: sessionId },
      },
      headers: thawaniWebhookHeaders(),
    });
    expect(webhookRes.ok()).toBeTruthy();
    const webhookBody = (await webhookRes.json()) as { ok?: boolean; bookingId?: string };
    expect(webhookBody.ok).toBe(true);
    expect(webhookBody.bookingId).toBe(identity.bookingId);

    const bundleQs = new URLSearchParams({
      bookingId: identity.bookingId,
      email: identity.email,
    });
    const bundleRes = await page.request.get(
      `/api/bookings/public-contract-access?${bundleQs.toString()}`
    );
    expect(bundleRes.ok()).toBeTruthy();
    const bundle = (await bundleRes.json()) as { bookings?: { paymentConfirmed?: boolean }[] };
    expect(bundle.bookings?.[0]?.paymentConfirmed).toBe(true);
  });
});
