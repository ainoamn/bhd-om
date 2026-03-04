'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Icon from '@/components/icons/Icon';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { cloudBackup } from '@/lib/storage/cloudBackup';

interface BackupInfo {
  lastBackup: number | null;
  dataSize: number;
}

export default function BackupManager() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';
  const [backupInfo, setBackupInfo] = useState<BackupInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [validation, setValidation] = useState<{ isValid: boolean; issues: string[] } | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadBackupInfo();
    validateData();
    
    // بدء المزامنة التلقائية
    cloudBackup.startAutoSync();
  }, []);

  const loadBackupInfo = () => {
    const info = cloudBackup.getBackupInfo();
    setBackupInfo(info);
  };

  const validateData = async () => {
    const validation = await cloudBackup.validateData();
    setValidation(validation);
  };

  const createBackup = async () => {
    setIsLoading(true);
    try {
      await cloudBackup.createBackup();
      loadBackupInfo();
      setMessage({ type: 'success', text: 'تم إنشاء نسخة احتياطية بنجاح' });
    } catch (error) {
      setMessage({ type: 'error', text: 'فشل إنشاء النسخة الاحتياطية' });
    } finally {
      setIsLoading(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const exportBackup = () => {
    cloudBackup.exportToFile();
    setMessage({ type: 'success', text: 'تم تصدير النسخة الاحتياطية' });
    setTimeout(() => setMessage(null), 3000);
  };

  const importBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const success = await cloudBackup.importFromFile(file);
      if (success) {
        setMessage({ type: 'success', text: 'تم استعادة النسخة الاحتياطية بنجاح' });
        loadBackupInfo();
        validateData();
      } else {
        setMessage({ type: 'error', text: 'فشل استعادة النسخة الاحتياطية' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'حدث خطأ أثناء استعادة النسخة الاحتياطية' });
    } finally {
      setIsLoading(false);
      setTimeout(() => setMessage(null), 3000);
    }
    e.target.value = '';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number | null): string => {
    if (!timestamp) return 'لا يوجد';
    return new Date(timestamp).toLocaleString('ar-OM');
  };

  return (
    <div className="space-y-6 p-6">
      <AdminPageHeader
        title={ar ? 'النسخ الاحتياطي' : 'Backup'}
        subtitle={ar ? 'إنشاء واستعادة نسخ احتياطية من بيانات النظام' : 'Create and restore backups of system data'}
      />
      {/* Alert Messages */}
      {message && (
        <div className={`p-4 rounded-xl border ${
          message.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center gap-2">
            <Icon name={message.type === 'success' ? 'check' : 'x'} className="w-5 h-5" />
            {message.text}
          </div>
        </div>
      )}

      {/* Backup Info */}
      <div className="admin-card p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="w-10 h-10 rounded-xl bg-[#8B6F47]/10 flex items-center justify-center">
            <Icon name="archive" className="w-5 h-5 text-[#8B6F47]" />
          </span>
          {ar ? 'معلومات النسخ الاحتياطي' : 'Backup info'}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-600">آخر نسخة احتياطية</label>
            <p className="text-lg font-semibold">{formatDate(backupInfo?.lastBackup || null)}</p>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-600">حجم البيانات</label>
            <p className="text-lg font-semibold">{backupInfo ? formatFileSize(backupInfo.dataSize) : '—'}</p>
          </div>
        </div>

        {/* Data Validation */}
        {validation && (
          <div className={`mt-4 p-4 rounded-xl border ${
            validation.isValid
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <Icon name={validation.isValid ? 'check' : 'x'} className="w-4 h-4" />
              <span className="font-medium">
                {validation.isValid ? 'البيانات سليمة' : 'تم العثور على مشاكل'}
              </span>
            </div>
            {!validation.isValid && validation.issues.length > 0 && (
              <ul className="text-sm space-y-1">
                {validation.issues.map((issue, index) => (
                  <li key={index} className="flex items-center gap-1">
                    <Icon name="chevronRight" className="w-3 h-3" />
                    {issue}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="admin-card p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">{ar ? 'الإجراءات' : 'Actions'}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={createBackup}
            disabled={isLoading}
            className="px-5 py-3 rounded-xl font-semibold bg-[#8B6F47] text-white hover:bg-[#6B5535] transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Icon name="archive" className="w-4 h-4" />
            {isLoading ? (ar ? 'جاري الإنشاء...' : 'Creating...') : (ar ? 'إنشاء نسخة احتياطية' : 'Create backup')}
          </button>
          <button
            onClick={exportBackup}
            className="px-5 py-3 rounded-xl font-semibold bg-white border-2 border-[#8B6F47] text-[#8B6F47] hover:bg-[#8B6F47]/5 transition-colors flex items-center justify-center gap-2"
          >
            <Icon name="externalLink" className="w-4 h-4" />
            {ar ? 'تصدير نسخة احتياطية' : 'Export backup'}
          </button>
          <label className="px-5 py-3 rounded-xl font-semibold bg-white border-2 border-gray-300 text-gray-700 hover:border-[#8B6F47] hover:bg-[#8B6F47]/5 transition-colors flex items-center justify-center gap-2 cursor-pointer">
            <Icon name="plus" className="w-4 h-4" />
            {ar ? 'استعادة نسخة احتياطية' : 'Restore backup'}
            <input type="file" accept=".json" onChange={importBackup} className="hidden" disabled={isLoading} />
          </label>
          <button
            onClick={validateData}
            className="px-5 py-3 rounded-xl font-semibold bg-white border-2 border-gray-300 text-gray-700 hover:border-[#8B6F47] hover:bg-[#8B6F47]/5 transition-colors flex items-center justify-center gap-2"
          >
            <Icon name="check" className="w-4 h-4" />
            {ar ? 'التحقق من البيانات' : 'Validate data'}
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="admin-card p-6 bg-[#8B6F47]/5 border-[#8B6F47]/20">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="w-10 h-10 rounded-xl bg-[#8B6F47]/10 flex items-center justify-center">
            <Icon name="information" className="w-5 h-5 text-[#8B6F47]" />
          </span>
          {ar ? 'تعليمات هامة' : 'Important notes'}
        </h3>
        <div className="space-y-3 text-gray-700">
          <div className="flex items-start gap-2">
            <Icon name="check" className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#8B6F47]" />
            <p>{ar ? 'يتم إنشاء نسخة احتياطية تلقائياً كل 5 دقائق للتحقق من سلامة البيانات' : 'Backups are created automatically every 5 minutes.'}</p>
          </div>
          <div className="flex items-start gap-2">
            <Icon name="check" className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#8B6F47]" />
            <p>{ar ? 'يتم تخزين النسخ في IndexedDB (أكثر استقراراً من localStorage)' : 'Backups are stored in IndexedDB.'}</p>
          </div>
          <div className="flex items-start gap-2">
            <Icon name="check" className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#8B6F47]" />
            <p>{ar ? 'يفضل تصدير نسخة وحفظها في مكان آمن خارج المتصفح' : 'Export and save a copy outside the browser.'}</p>
          </div>
          <div className="flex items-start gap-2">
            <Icon name="information" className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600" />
            <p>{ar ? 'بيانات localStorage قد تضيع عند مسح بيانات المتصفح' : 'localStorage data may be lost when clearing browser data.'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
