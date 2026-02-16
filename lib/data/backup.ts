/**
 * نسخ احتياطي واستعادة البيانات
 * البيانات تُخزّن في localStorage - يمكن فقدانها عند مسح المتصفح
 * استخدم التصدير بانتظام لحفظ نسخة والاستيراد عند الحاجة
 */

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
      if (key.startsWith('bhd') || key.startsWith('bhd-')) {
        if (value !== null && value !== undefined) {
          localStorage.setItem(key, value);
          restored++;
        }
      }
    }
    window.dispatchEvent(new StorageEvent('storage', { key: 'bhd_backup_restored' }));
    return { success: true, restored };
  } catch (e) {
    return { success: false, restored: 0, error: e instanceof Error ? e.message : 'خطأ غير معروف' };
  }
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
