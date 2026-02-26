/**
 * نسخ احتياطي واستعادة البيانات
 * البيانات تُخزّن في localStorage - يمكن فقدانها عند مسح المتصفح
 * استخدم التصدير بانتظام لحفظ نسخة والاستيراد عند الحاجة
 */

/** جميع مفاتيح البيانات في localStorage - للنسخ الاحتياطي الكامل */
const BACKUP_KEYS = [
  'bhd_chart_of_accounts',
  'bhd_journal_entries',
  'bhd_accounting_documents',
  'bhd_fiscal_settings',
  'bhd_fiscal_periods',
  'bhd_audit_log',
  'bhd_property_bookings',
  'bhd_property_overrides',
  'bhd_property_data',
  'bhd_address_book',
  'bhd_rental_contracts',
  'bhd_booking_terms',
  'bhd_bank_accounts',
  'bhd-pages-visibility',
  'bhd-ads',
  'bhd_booking_checks',
  'bhd_contract_checks',
  'bhd_booking_documents',
  'bhd_booking_cancellation_requests',
  'bhd_property_landlords',
  'bhd_document_templates',
  'bhd_print_options',
  'bhd_company_data',
  'bhd_draft_keys',
  'bhd_dashboard_settings',
  'bhd_contact_category_permissions',
] as const;

export interface BackupData {
  version: number;
  exportedAt: string;
  keys: Record<string, string | null>;
}

/** تصدير جميع البيانات إلى JSON */
export function exportBackup(): string {
  if (typeof window === 'undefined') return '{}';
  const keys: Record<string, string | null> = {};
  for (const key of BACKUP_KEYS) {
    keys[key] = localStorage.getItem(key);
  }
  // تصدير المسودات (bhd_draft_*) ديناميكياً
  const draftKeysRaw = localStorage.getItem('bhd_draft_keys');
  if (draftKeysRaw) {
    try {
      const draftIds: string[] = JSON.parse(draftKeysRaw);
      for (const id of draftIds) {
        const val = localStorage.getItem('bhd_draft_' + id);
        if (val !== null) keys['bhd_draft_' + id] = val;
      }
    } catch {}
  }
  const data: BackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    keys,
  };
  return JSON.stringify(data, null, 2);
}

/** استيراد من نسخة احتياطية */
export function importBackup(json: string): { success: boolean; restored: number; error?: string } {
  if (typeof window === 'undefined') return { success: false, restored: 0, error: 'غير متاح' };
  try {
    const data = JSON.parse(json) as BackupData;
    if (!data.keys || typeof data.keys !== 'object') {
      return { success: false, restored: 0, error: 'تنسيق غير صالح' };
    }
    let restored = 0;
    for (const [key, value] of Object.entries(data.keys)) {
      if ((key.startsWith('bhd') || key.startsWith('bhd-')) && (value !== null && value !== undefined)) {
        try {
          localStorage.setItem(key, value);
          restored++;
        } catch {}
      }
    }
    window.dispatchEvent(new StorageEvent('storage', { key: 'bhd_backup_restored' }));
    return { success: true, restored };
  } catch (e) {
    return { success: false, restored: 0, error: e instanceof Error ? e.message : 'خطأ غير معروف' };
  }
}

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
] as const;

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
 * لا يمس: العقارات، دفتر العناوين، بيانات الشركة، الحسابات البنكية، القوالب
 */
export function resetAllOperationalData(): number {
  if (typeof window === 'undefined') return 0;
  let removed = 0;
  for (const key of RESET_KEYS) {
    if (localStorage.getItem(key) !== null) {
      localStorage.removeItem(key);
      removed++;
    }
  }
  clearDrafts();
  resetPropertyStatuses();
  window.dispatchEvent(new StorageEvent('storage', { key: 'bhd_reset_all' }));
  return removed;
}

/** تنزيل ملف النسخة الاحتياطية */
export function downloadBackup(): void {
  if (typeof window === 'undefined') return;
  const json = exportBackup();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bhd-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
