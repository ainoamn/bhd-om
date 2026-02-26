'use client';

import { useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { downloadBackup, importBackup, resetAllOperationalData } from '@/lib/data/backup';
import { siteConfig } from '@/config/site';

export default function BackupAdminPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';
  const [importing, setImporting] = useState(false);
  const [resetConfirm, setResetConfirm] = useState('');
  const [result, setResult] = useState<{ success: boolean; restored?: number; error?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    downloadBackup();
    setResult({ success: true });
  };

  const handleReset = () => {
    if (resetConfirm !== (ar ? 'تصفير' : 'RESET')) return;
    const n = resetAllOperationalData();
    setResetConfirm('');
    setResult({ success: true, restored: n });
    window.location.reload();
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
          <p className="text-sm font-medium text-amber-900 mb-2">
            {ar ? '💡 نصيحة: احفظ الملف المُصدَّر في مكان آمن (سحابة، قرص خارجي). يمكنك استعادته لاحقاً من أي متصفح.' : '💡 Tip: Save the exported file somewhere safe (cloud, external drive). You can restore it later from any browser.'}
          </p>
          <p className="text-sm font-medium text-amber-900">
            {ar
              ? '🔄 قبل أي تحديث: صدّر من هنا أولاً، ثم نفّذ السكريبت scripts\\backup-all.ps1 لنسخ قاعدة البيانات، واحفظ الملفات في مكان آمن. راجع docs/UPDATE_GUIDE.md.'
              : '🔄 Before any update: export here first, then run scripts\\backup-all.ps1 to copy the database, and save files somewhere safe. See docs/UPDATE_GUIDE.md.'}
          </p>
        </div>

        <div className="admin-card p-6 bg-blue-50/50 border-blue-200">
          <h3 className="font-bold text-blue-900 mb-2">
            {ar ? '📂 المستودع والمزامنة بين الأجهزة' : '📂 Repository & Multi-Computer Sync'}
          </h3>
          <p className="text-blue-800 text-sm leading-relaxed mb-3">
            {ar
              ? 'الكود المصدري موجود على GitHub. للعمل على أكثر من كمبيوتر بدون انقطاع: ارفع (push) بانتظام قبل الانتقال، وسحِب (pull) عند البدء على الجهاز الآخر. راجع docs/WORKFLOW.md.'
              : 'Source code is on GitHub. For multi-computer work without interruption: push regularly before switching, and pull when starting on another device. See docs/WORKFLOW.md.'}
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href={siteConfig.repository.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-white bg-gray-800 hover:bg-gray-900 transition-colors"
            >
              <span>🐙</span>
              GitHub: {siteConfig.repository.url.replace('https://', '')}
            </a>
            <span className="text-sm text-blue-700 self-center">
              {ar ? 'أمر سريع: npm run sync' : 'Quick: npm run sync'}
            </span>
          </div>
        </div>

        <div className="admin-card p-6 border-red-200 bg-red-50/50">
          <h3 className="font-bold text-red-900 mb-2">{ar ? 'تصفير كل البيانات التشغيلية' : 'Reset All Operational Data'}</h3>
          <p className="text-red-800 text-sm leading-relaxed mb-4">
            {ar
              ? 'سيتم حذف الحجوزات، العقود، العمليات المحاسبية، المستندات، والمسودات. لن يتأثر: العقارات، دفتر العناوين، بيانات الشركة، الحسابات البنكية.'
              : 'This will delete all bookings, contracts, accounting operations, documents, and drafts. Unaffected: properties, address book, company data, bank accounts.'}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={resetConfirm}
              onChange={(e) => setResetConfirm(e.target.value)}
              placeholder={ar ? 'اكتب "تصفير" للتأكيد' : 'Type "RESET" to confirm'}
              className="px-4 py-2 rounded-lg border border-red-300 bg-white text-red-900 placeholder-red-400 max-w-xs"
            />
            <button
              type="button"
              onClick={handleReset}
              disabled={resetConfirm !== (ar ? 'تصفير' : 'RESET')}
              className="px-6 py-2 rounded-lg font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {ar ? 'تصفير الكل' : 'Reset All'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
