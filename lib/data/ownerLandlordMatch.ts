/**
 * مطابقة المالك مع بيانات العقد في الحجز (contractData) — للخادم والواجهة.
 * + مطابقة محفظة العقار: حجوزات على `propertyId` العددي المطابق لعقار في الكتالوج
 *   يملكه المستخدم في Prisma (عبر serialNumber).
 */

import { properties } from './properties';

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

/** تطبيع أرقام الهاتف (عمان 968) — بدون استيراد addressBook لتفادي دورات الاعتماد */
function normalizePhoneDigits(phone: string): string {
  let digits = (phone || '').replace(/\D/g, '');
  if (digits.length < 6) return digits;
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 8 && digits.startsWith('9')) return `968${digits}`;
  return digits;
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
  const last8Match = (userPhone.length >= 6 && lp.length >= 6 && userPhone === lp);
  const upFull = normalizePhoneDigits(ctx.userPhone || '');
  const lpFull = normalizePhoneDigits(String(cd.landlordPhone || ''));
  const fullDigitsMatch = upFull.length >= 8 && lpFull.length >= 8 && upFull === lpFull;
  return (ue.length >= 3 && le.length >= 3 && ue === le) || last8Match || fullDigitsMatch;
}

/** الرقم التسلسلي للعقار في كتالوج الموقع (يتوافق مع حقل propertyId في الحجز) */
export function getSerialNumberForStaticPropertyId(propertyId: number): string | null {
  const p = properties.find((x) => x.id === propertyId);
  const s = p?.serialNumber?.trim();
  return s || null;
}

/** هل الحجز على عقار مُسجَّل في Prisma باسم هذا المالك؟ (مطابقة serialNumber) */
export function bookingMatchesOwnerPropertyPortfolio(booking: Record<string, unknown>, ownerDbSerials: Set<string>): boolean {
  if (!ownerDbSerials.size) return false;
  const pid = Number(booking.propertyId);
  if (!Number.isFinite(pid)) return false;
  const serial = getSerialNumberForStaticPropertyId(pid);
  return !!(serial && ownerDbSerials.has(serial));
}

/** واجهة موحّدة: مالك الحجز عبر بيانات العقد أو عبر محفظة عقاراته في DB */
export function bookingRelevantToOwnerContext(
  booking: Record<string, unknown>,
  ctx: LandlordMatchContext,
  ownerPortfolioSerials?: Set<string> | null
): boolean {
  return (
    contractDataMatchesLandlord(booking.contractData as Record<string, unknown> | null | undefined, ctx) ||
    !!(ownerPortfolioSerials && bookingMatchesOwnerPropertyPortfolio(booking, ownerPortfolioSerials))
  );
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
  userPhoneFull?: string | null,
  ownerPortfolioSerials?: Set<string> | null
): boolean {
  return (
    bookingMatchesClientRecord(booking, userEmail, userPhone8) ||
    contractDataMatchesLandlord(booking.contractData as Record<string, unknown> | null | undefined, {
      userEmail,
      userPhone: userPhoneFull || userPhone8 || undefined,
    }) ||
    !!(ownerPortfolioSerials && bookingMatchesOwnerPropertyPortfolio(booking, ownerPortfolioSerials))
  );
}

