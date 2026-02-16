'use client';

import { useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { downloadBackup, importBackup } from '@/lib/data/backup';

export default function BackupAdminPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; restored?: number; error?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    downloadBackup();
    setResult({ success: true });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setResult(null);
    try {
      const text = await file.text();
      const res = importBackup(text);
      setResult(res);
      if (res.success) {
        window.location.reload();
      }
    } catch {
      setResult({ success: false, error: ar ? 'فشل قراءة الملف' : 'Failed to read file' });
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  return (
    <div>
      <AdminPageHeader
        title={ar ? 'النسخ الاحتياطي والاستعادة' : 'Backup & Restore'}
        subtitle={ar ? 'البيانات تُخزّن في المتصفح - صدّر بانتظام لتجنّب الفقدان' : 'Data is stored in browser - export regularly to prevent loss'}
      />

      <div className="space-y-6">
        <div className="admin-card p-6">
          <h3 className="font-bold text-gray-900 mb-2">{ar ? 'لماذا أفقد بياناتي؟' : 'Why do I lose data?'}</h3>
          <p className="text-gray-600 text-sm leading-relaxed mb-4">
            {ar
              ? 'النظام يحفظ البيانات في ذاكرة المتصفح (localStorage). تُمسح عند: مسح بيانات المتصفح، استخدام التصفح الخاص، تغيير المتصفح أو الجهاز. الحل: صدّر نسخة احتياطية أسبوعياً أو بعد أي عملية مهمة.'
              : 'The system stores data in browser storage (localStorage). It gets cleared when: clearing browser data, using private/incognito mode, switching browser or device. Solution: export a backup weekly or after any important operation.'}
          </p>

          <div className="flex flex-wrap gap-4">
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
            >
              <span>📥</span>
              {ar ? 'تصدير نسخة احتياطية' : 'Export Backup'}
            </button>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                disabled={importing}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-[#8B6F47] bg-[#8B6F47]/10 hover:bg-[#8B6F47]/20 border border-[#8B6F47]/30 transition-colors disabled:opacity-50"
              >
                <span>{importing ? '⏳' : '📤'}</span>
                {importing ? (ar ? 'جاري الاستعادة...' : 'Restoring...') : (ar ? 'استيراد نسخة احتياطية' : 'Import Backup')}
              </button>
            </div>
          </div>

          {result && (
            <div className={`mt-4 p-4 rounded-xl ${result.success ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
              {result.success ? (
                result.restored !== undefined ? (
                  <p>{ar ? `تم استعادة ${result.restored} مجموعة بيانات` : `Restored ${result.restored} data sets`}</p>
                ) : (
                  <p>{ar ? 'تم تنزيل النسخة الاحتياطية' : 'Backup downloaded'}</p>
                )
              ) : (
                <p>{result.error}</p>
              )}
            </div>
          )}
        </div>

        <div className="admin-card p-6 bg-amber-50/50 border-amber-200">
          <p className="text-sm font-medium text-amber-900">
            {ar ? '💡 نصيحة: احفظ الملف المُصدَّر في مكان آمن (سحابة، قرص خارجي). يمكنك استعادته لاحقاً من أي متصفح.' : '💡 Tip: Save the exported file somewhere safe (cloud, external drive). You can restore it later from any browser.'}
          </p>
        </div>
      </div>
    </div>
  );
}
