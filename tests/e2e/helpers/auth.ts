import type { Page } from '@playwright/test';

export type E2ECredentials = { email: string; password: string };

export function resolveE2EAdminCredentials(): E2ECredentials | null {
  const email = (process.env.E2E_ADMIN_EMAIL || '').trim();
  const password = (process.env.E2E_ADMIN_PASSWORD || '').trim();
  if (email && password) return { email, password };
  if (process.env.CI) return null;
  return { email: 'admin@bhd-om.com', password: 'admin123' };
}

export async function loginWithCredentials(
  page: Page,
  creds: E2ECredentials
): Promise<void> {
  await page.goto('/ar/login');
  await page.getByLabel(/البريد الإلكتروني|email/i).fill(creds.email);
  await page.getByLabel(/كلمة المرور|password/i).fill(creds.password);
  await page.getByRole('button', { name: /دخول|login|sign in/i }).click();
  await page.waitForURL(/\/(ar|en)\/(admin|properties|my-bookings)/, { timeout: 30_000 });
}

export function buildE2EBookingIdentity(ts = Date.now()) {
  const suffix = String(ts);
  return {
    bookingId: `BKG-E2E-${suffix}`,
    email: `e2e-${suffix}@example.test`,
    phone: `+9689${suffix.slice(-7).padStart(7, '0')}`,
    unitKey: `e2e-unit-${suffix}`,
  };
}

/** Origin/Referer مطلوبان لـ PATCH في production (isAllowedBrowserOrigin) */
export function e2eBrowserHeaders(): Record<string, string> {
  const base = (process.env.E2E_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
  return { Origin: base, Referer: `${base}/` };
}
