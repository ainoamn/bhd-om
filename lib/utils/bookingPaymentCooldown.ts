/**
 * بعد فشل الدفع/المزامنة: منع إعادة المحاولة لمدة 5 دقائق (واجهة العميل).
 */

const PREFIX = 'bhd_booking_pay_cd_';
const COOLDOWN_MS = 5 * 60 * 1000;

function userKey(userId: string | undefined, email: string, phone: string): string {
  const u = (userId || '').trim();
  if (u) return `u:${u}`;
  const e = (email || '').trim().toLowerCase();
  const p = (phone || '').replace(/\D/g, '').slice(-8);
  return `k:${e}|${p}`;
}

export function bookingPaymentCooldownStorageKey(
  propertyId: number,
  unitKey: string | undefined,
  userId: string | undefined,
  email: string,
  phone: string
): string {
  return `${PREFIX}${propertyId}_${unitKey || '_'}_${userKey(userId, email, phone)}`;
}

export function setBookingPaymentCooldown(
  propertyId: number,
  unitKey: string | undefined,
  userId: string | undefined,
  email: string,
  phone: string
): void {
  if (typeof window === 'undefined') return;
  try {
    const until = Date.now() + COOLDOWN_MS;
    localStorage.setItem(
      bookingPaymentCooldownStorageKey(propertyId, unitKey, userId, email, phone),
      String(until)
    );
  } catch {
    /* ignore */
  }
}

export function clearBookingPaymentCooldown(
  propertyId: number,
  unitKey: string | undefined,
  userId: string | undefined,
  email: string,
  phone: string
): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(bookingPaymentCooldownStorageKey(propertyId, unitKey, userId, email, phone));
  } catch {
    /* ignore */
  }
}

/** المتبقي بالمللي ثانية، أو 0 */
export function getBookingPaymentCooldownRemainingMs(
  propertyId: number,
  unitKey: string | undefined,
  userId: string | undefined,
  email: string,
  phone: string
): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(bookingPaymentCooldownStorageKey(propertyId, unitKey, userId, email, phone));
    if (!raw) return 0;
    const until = parseInt(raw, 10);
    if (Number.isNaN(until)) return 0;
    return Math.max(0, until - Date.now());
  } catch {
    return 0;
  }
}
