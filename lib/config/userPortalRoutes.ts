/**
 * مسارات بوابة العميل/المالك — مصدر واحد للصلاحيات (middleware + AdminLayoutInner).
 * `/admin` للرئيسية فقط (مطابقة تامة)؛ باقي المسارات ببادئات محددة.
 */

export const PORTAL_PAGE_PATHS = [
  '/portal',
  '/portal/tenant',
  '/portal/owner',
  '/admin/my-bookings',
  '/admin/my-contracts',
  '/admin/my-invoices',
  '/admin/my-receipts',
  '/admin/my-properties',
  '/admin/my-account',
  '/admin/notifications',
  '/admin/my-contacts',
  '/admin/my-maintenance',
  '/admin/address-book',
  '/admin/contract-review',
] as const;

export type PortalPagePath = (typeof PORTAL_PAGE_PATHS)[number];

export function stripLocale(pathname: string): string {
  return pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '') || pathname;
}

/** هل المسار (بدون locale) مسموح للعميل أو المالك؟ */
export function isPathAllowedForPortalUser(pathname: string): boolean {
  const clean = stripLocale(pathname);
  if (clean === '/admin') return true;
  if (clean === '/portal' || clean.startsWith('/portal/')) return true;
  return PORTAL_PAGE_PATHS.some((p) => clean === p || clean.startsWith(`${p}/`));
}
