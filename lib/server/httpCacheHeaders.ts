/**
 * Cache-Control للقراءات عبر API مع جلسة (private).
 * القيم مبنية على تغيّر البيانات الفعلي: كلما زاد التحديث قلّ max-age.
 * stale-while-revalidate يعطي استجابة فورية من الكاش الخاص بالمتصفح ثم تحديثاً خلفياً.
 */
export const HTTP_CACHE_VARY_AUTH = 'Cookie, Authorization';

export const httpCachePrivate = (maxAgeSeconds: number, staleWhileRevalidateSeconds: number) =>
  `private, max-age=${maxAgeSeconds}, stale-while-revalidate=${staleWhileRevalidateSeconds}`;

/** حجوزات: تغيّر متكرر (حالة، دفع، توقيع) */
export const CACHE_BOOKINGS_GET = httpCachePrivate(8, 30);

/** عقود: مرتبطة بمراحل الحجز */
export const CACHE_CONTRACTS_LIST_GET = httpCachePrivate(12, 45);

/** دفتر عناوين: تعديلات متوسطة عند الإدارة */
export const CACHE_ADDRESS_BOOK_GET = httpCachePrivate(12, 45);

/** قائمة عقارات الإدارة: تغيّر أقل من الحجوزات */
export const CACHE_ADMIN_PROPERTIES_GET = httpCachePrivate(45, 180);

/** جهة الاتصال المرتبطة بالمستخدم */
export const CACHE_LINKED_CONTACT_GET = httpCachePrivate(20, 45);

/** مستندات محاسبة (لوحة) */
export const CACHE_ACCOUNTING_DOCUMENTS_GET = httpCachePrivate(15, 45);

/** قيود يومية */
export const CACHE_ACCOUNTING_JOURNAL_GET = httpCachePrivate(20, 60);

/** دليل الحسابات: يتغيّر نادراً */
export const CACHE_ACCOUNTING_ACCOUNTS_GET = httpCachePrivate(60, 300);

/** مستندات المستخدم (فواتير/إيصالات) */
export const CACHE_ME_ACCOUNTING_DOCS_GET = httpCachePrivate(15, 45);

/** قائمة اشتراكات الأدمن: منطق تطبيق/تجديد — حذر من كاش طويل */
export const CACHE_ADMIN_SUBSCRIPTIONS_GET = httpCachePrivate(8, 25);
