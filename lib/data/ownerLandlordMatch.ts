/**
 * مطابقة المالك مع بيانات العقد في الحجز (contractData) — للخادم والواجهة.
 */

export interface LandlordMatchContext {
  /** معرف جهة الاتصال في دفتر العناوين (إن وُجد) */
  contactId?: string;
  userEmail?: string | null;
  userPhone?: string | null;
}

function normEmail(s: string): string {
  return (s || '').trim().toLowerCase();
}

/** آخر 8 أرقام للمقارنة (يتوافق مع منطق /api/bookings والواجهة) */
export function normPhoneLast8(s: string): string {
  return (s || '').replace(/\D/g, '').replace(/^968/, '').slice(-8);
}

/**
 * هل بيانات العقد في الحجز تشير إلى أن المستخدم الحالي هو المالك؟
 */
export function contractDataMatchesLandlord(
  contractData: Record<string, unknown> | undefined | null,
  ctx: LandlordMatchContext
): boolean {
  const cd = contractData || {};
  const cid = (ctx.contactId || '').trim();
  if (cid && String(cd.landlordContactId || '').trim() === cid) return true;
  const le = normEmail(String(cd.landlordEmail || ''));
  const lp = normPhoneLast8(String(cd.landlordPhone || ''));
  const ue = normEmail(ctx.userEmail || '');
  const userPhone = normPhoneLast8(ctx.userPhone || '');
  return (ue.length >= 3 && le.length >= 3 && ue === le) || (userPhone.length >= 6 && lp.length >= 6 && userPhone === lp);
}

/** مطابقة حجز كعميل (بريد/هاتف الحجز = المستخدم) */
export function bookingMatchesClientRecord(
  booking: Record<string, unknown>,
  userEmail: string,
  userPhone8: string
): boolean {
  const ue = normEmail(userEmail);
  const matchEmail = ue.length >= 3 && normEmail(String(booking.email || '')) === ue;
  const matchPhone = userPhone8.length >= 6 && normPhoneLast8(String(booking.phone || '')) === userPhone8;
  return matchEmail || matchPhone;
}

/**
 * المالك في حجز: contractData (بريد/هاتف المالك) أو سجل الحجز كعميل.
 * `userPhoneFull` يُفضّل أن يكون هاتف المستخدم كما في قاعدة البيانات لتوحيد التطبيع مع الواجهة.
 */
export function bookingVisibleToOwner(
  booking: Record<string, unknown>,
  userEmail: string,
  userPhone8: string,
  userPhoneFull?: string | null
): boolean {
  return (
    bookingMatchesClientRecord(booking, userEmail, userPhone8) ||
    contractDataMatchesLandlord(booking.contractData as Record<string, unknown> | null | undefined, {
      userEmail,
      userPhone: userPhoneFull || userPhone8 || undefined,
    })
  );
}

