/**
 * نسخ احتياطي واستعادة البيانات
 * البيانات تُخزّن في localStorage - يمكن فقدانها عند مسح المتصفح
 * استخدم التصدير بانتظام لحفظ نسخة والاستيراد عند الحاجة
 */

import { clearAddressBookLocalStorage } from '@/lib/data/addressBook';

/** مفاتيح البيانات التشغيلية التي تُصفَّر عند إعادة التعيين */
const RESET_KEYS = [
  'bhd_property_bookings',
  'bhd_booking_cancellation_requests',
  'bhd_rental_contracts',
  'bhd_contract_checks',
  'bhd_booking_checks',
  'bhd_booking_documents',
  'bhd_chart_of_accounts',
  'bhd_journal_entries',
  'bhd_accounting_documents',
  'bhd_fiscal_settings',
  'bhd_fiscal_periods',
  'bhd_audit_log',
  'bhd_booking_terms',
  'bhd_draft_keys',
  'bhd_property_data',
  'bhd_property_landlords',
] as const;

/** مفاتيح لا تُمس عند التصفير (تُحفظ) — تُحدَّث حالة العقارات فقط عبر resetPropertyStatuses */
const RESET_KEEP_KEYS = new Set([
  'bhd_address_book',
  'bhd_company_data',
  'bhd_bank_accounts',
  'bhd_document_templates',
  'bhd_dashboard_settings',
  'bhd_contact_category_permissions',
  'bhd-pages-visibility',
  'bhd-ads',
  'bhd_print_options',
  'bhd_property_overrides',
]);

/** مسح جميع المسودات bhd_draft_* */
function clearDrafts(): void {
  if (typeof window === 'undefined') return;
  const draftKeys = localStorage.getItem('bhd_draft_keys');
  if (draftKeys) {
    try {
      const keys: string[] = JSON.parse(draftKeys);
      for (const k of keys) localStorage.removeItem('bhd_draft_' + k);
    } catch {}
  }
  localStorage.removeItem('bhd_draft_keys');
}

const PROPERTY_OVERRIDES_KEY = 'bhd_property_overrides';

/** إعادة حالة العقارات (RENTED/RESERVED/SOLD) إلى AVAILABLE */
function resetPropertyStatuses(): void {
  if (typeof window === 'undefined') return;
  const raw = localStorage.getItem(PROPERTY_OVERRIDES_KEY);
  if (!raw) return;
  try {
    const overrides: Record<string, { isPublished?: boolean; businessStatus?: string; units?: Record<string, { businessStatus?: string; isPublished?: boolean }> }> = JSON.parse(raw);
    let changed = false;
    for (const [id, o] of Object.entries(overrides)) {
      if (!o) continue;
      if (o.businessStatus && o.businessStatus !== 'AVAILABLE' && o.businessStatus !== 'DRAFT' && o.businessStatus !== 'INACTIVE') {
        overrides[id] = { ...o, businessStatus: 'AVAILABLE' };
        changed = true;
      }
      if (o.units) {
        for (const [uk, u] of Object.entries(o.units)) {
          if (u?.businessStatus && u.businessStatus !== 'AVAILABLE' && u.businessStatus !== 'DRAFT' && u.businessStatus !== 'INACTIVE') {
            overrides[id].units = { ...overrides[id].units, [uk]: { ...u, businessStatus: 'AVAILABLE' } };
            changed = true;
          }
        }
      }
    }
    if (changed) {
      localStorage.setItem(PROPERTY_OVERRIDES_KEY, JSON.stringify(overrides));
      document.cookie = `${PROPERTY_OVERRIDES_KEY}=${encodeURIComponent(JSON.stringify(overrides))};path=/;max-age=31536000`;
      window.dispatchEvent(new StorageEvent('storage', { key: PROPERTY_OVERRIDES_KEY }));
    }
  } catch {}
}

/**
 * تصفير كل العقود والحجوزات والعمليات المحاسبية والبدء من جديد
 * لا يمس: دفتر العناوين، بيانات الشركة، الحسابات البنكية، القوالب، إعدادات لوحة التحكم
 */
export function resetAllOperationalData(): number {
  if (typeof window === 'undefined') return 0;
  let removed = 0;
  // 1) حذف المفاتيح المحددة
  for (const key of RESET_KEYS) {
    try {
      if (localStorage.getItem(key) !== null) {
        localStorage.removeItem(key);
        removed++;
      }
    } catch (_) {}
  }
  // 2) حذف أي مفتاح آخر يبدأ بـ bhd ولا يكون من المحفوظات
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('bhd_') || key.startsWith('bhd-')) && !RESET_KEEP_KEYS.has(key)) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
      removed++;
    }
  } catch (_) {}
  // 3) مسح المسودات (bhd_draft_*)
  clearDrafts();
  // 4) إعادة حالة العقارات إلى متاح
  resetPropertyStatuses();
  window.dispatchEvent(new StorageEvent('storage', { key: 'bhd_reset_all' }));
  return removed;
}

/**
 * بعد تصفير قاعدة البيانات على الخادم: يمسح التخزين المحلي التشغيلي + دفتر العناوين.
 * بدون ذلك تبقى `bhd_property_bookings` وغيرها في المتصفح؛ مستخدم جديد بنفس البريد يرى حجوزات قديمة (مطابقة بالبريد/الهاتف وليس بمعرّف المستخدم).
 */
export function clearClientCachesAfterServerDbReset(): number {
  if (typeof window === 'undefined') return 0;
  const removed = resetAllOperationalData();
  clearAddressBookLocalStorage();
  return removed;
}

/**
 * عزل البيانات المحلية حسب المستخدم المسجّل دخولاً.
 * إذا تغيّر المستخدم على نفس المتصفح (مثلاً تسجيل مستخدم جديد بنفس البريد بعد تصفير الخادم)
 * قد تبقى حجوزات/عقود قديمة محفوظة في localStorage وتظهر في "حجوزاتي".
 *
 * هذه الدالة تمسح البيانات التشغيلية المحلية فقط (ولا تمس دفتر العناوين أو إعدادات اللوحة).
 */
export function clearOperationalClientDataForNewAuthUser(): number {
  if (typeof window === 'undefined') return 0;
  return resetAllOperationalData();
}

/**
 * تم إيقاف النسخ الاحتياطي المحلي (localStorage) افتراضياً.
 * النسخ والاستعادة الرسمية أصبحت من الخادم عبر:
 * - /api/admin/data/backup
 * - /api/admin/data/restore
 */
