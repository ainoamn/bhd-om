import { timingSafeEqual } from 'crypto';

/** يتطلب تعيين ADMIN_DATA_RESET_PIN في البيئة (8 أحرف على الأقل). */
export function isAdminDataPinConfigured(): boolean {
  const p = process.env.ADMIN_DATA_RESET_PIN?.trim();
  return !!p && p.length >= 8;
}

export function verifyAdminDataPin(pin: string | undefined): boolean {
  const expected = process.env.ADMIN_DATA_RESET_PIN?.trim();
  if (!expected || expected.length < 8) return false;
  const a = Buffer.from(pin ?? '', 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
