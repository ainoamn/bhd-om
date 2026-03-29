'use client';

import { useParams } from 'next/navigation';
import { useState, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { resetAllOperationalData, importBackup, downloadBackup } from '@/lib/data/backup';

export default function AdminDataPage() {
  const params = useParams();
  const { data: session, status } = useSession();
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';
  const userRole = (session?.user as { role?: string })?.role;
  const [securityPin, setSecurityPin] = useState('');
  const [serverResetConfirm, setServerResetConfirm] = useState(false);
  const [localResetConfirm, setLocalResetConfirm] = useState(false);
  const [resetDone, setResetDone] = useState<number | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [serverBusy, setServerBusy] = useState(false);
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  const handleResetLocal = () => {
    if (!localResetConfirm) return;
    setResetError(null);
    try {
      if (typeof window === 'undefined') {
        setResetError(ar ? 'التصفير متاح فقط في المتصفح' : 'Reset is only available in the browser');
        return;
      }
      const removed = resetAllOperationalData();
      setResetDone(removed);
      setLocalResetConfirm(false);
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (e) {
      setResetError(e instanceof Error ? e.message : 'خطأ');
    }
  };

  const handleServerReset = async () => {
    if (!securityPin.trim()) {
      setServerError(ar ? 'أدخل رمز الحماية' : 'Enter security PIN');
      return;
    }
    setServerBusy(true);
    setServerError(null);
    setServerMessage(null);
    try {
      const res = await fetch('/api/admin/data/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ pin: securityPin }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        adminEmail?: string;
        serialNumber?: string;
        message?: string;
      };
      if (!res.ok) {
        if (data.error === 'DATA_RESET_PIN_NOT_CONFIGURED' || res.status === 503) {
          setServerError(
            ar
              ? 'لم يُعرّف ADMIN_DATA_RESET_PIN في الخادم (8 أحرف على الأقل).'
              : 'ADMIN_DATA_RESET_PIN is not set on the server (min 8 characters).'
          );
        } else if (data.error === 'INVALID_PIN') {
          setServerError(ar ? 'رمز الحماية غير صحيح' : 'Invalid security PIN');
        } else {
          setServerError(ar ? 'فشل التصفير على الخادم' : 'Server reset failed');
        }
        return;
      }
      setServerMessage(
        ar
          ? `تم تصفير قاعدة البيانات (العقارات محفوظة). تسجيل الدخول كـ: ${data.adminEmail ?? '—'} — سيتم تسجيل الخروج لإعادة الدخول.`
          : `Database reset (properties kept). Sign in as: ${data.adminEmail ?? '—'} — signing out...`
      );
      setServerResetConfirm(false);
      setTimeout(() => {
        void signOut({ callbackUrl: `/${locale}/login` });
      }, 2500);
    } catch {
      setServerError(ar ? 'خطأ شبكة' : 'Network error');
    } finally {
      setServerBusy(false);
    }
  };

  const handleServerBackup = async () => {
    if (!securityPin.trim()) {
      setServerError(ar ? 'أدخل رمز الحماية' : 'Enter security PIN');
      return;
    }
    setServerBusy(true);
    setServerError(null);
    setServerMessage(null);
    try {
      const res = await fetch('/api/admin/data/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ pin: securityPin }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (res.status === 503 || data.error === 'DATA_RESET_PIN_NOT_CONFIGURED') {
          setServerError(
            ar
              ? 'لم يُعرّف ADMIN_DATA_RESET_PIN في الخادم.'
              : 'ADMIN_DATA_RESET_PIN is not set on the server.'
          );
        } else if (data.error === 'INVALID_PIN') {
          setServerError(ar ? 'رمز الحماية غير صحيح' : 'Invalid security PIN');
        } else {
          setServerError(ar ? 'فشل النسخ الاحتياطي' : 'Backup failed');
        }
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cd = res.headers.get('Content-Disposition');
      const m = cd?.match(/filename="([^"]+)"/);
      a.download = m?.[1] ?? `bhd-db-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setServerMessage(ar ? 'تم تنزيل نسخة قاعدة البيانات.' : 'Database backup downloaded.');
    } catch {
      setServerError(ar ? 'خطأ شبكة' : 'Network error');
    } finally {
      setServerBusy(false);
    }
  };

  const handleServerRestore = async (file: File | null) => {
    if (!file) return;
    if (!securityPin.trim()) {
      setServerError(ar ? 'أدخل رمز الحماية' : 'Enter security PIN');
      return;
    }
    setServerBusy(true);
    setServerError(null);
    setServerMessage(null);
    try {
      const fd = new FormData();
      fd.append('pin', securityPin);
      fd.append('file', file);
      const res = await fetch('/api/admin/data/restore', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) {
        if (res.status === 503) {
          setServerError(
            ar
              ? 'لم يُعرّف ADMIN_DATA_RESET_PIN في الخادم.'
              : 'ADMIN_DATA_RESET_PIN is not set on the server.'
          );
        } else if (data.error === 'INVALID_PIN') {
          setServerError(ar ? 'رمز الحماية غير صحيح' : 'Invalid security PIN');
        } else {
          setServerError(data.message || (ar ? 'فشل الاستعادة' : 'Restore failed'));
        }
        return;
      }
      setServerMessage(ar ? 'تمت استعادة قاعدة البيانات. سيتم تسجيل الخروج…' : 'Database restored. Signing out…');
      setTimeout(() => {
        void signOut({ callbackUrl: `/${locale}/login` });
      }, 2000);
    } catch {
      setServerError(ar ? 'خطأ شبكة' : 'Network error');
    } finally {
      setServerBusy(false);
      if (restoreInputRef.current) restoreInputRef.current.value = '';
    }
  };

  const handleLocalBackupDownload = () => {
    downloadBackup();
    setServerMessage(ar ? 'تم تنزيل نسخة بيانات المتصفح (localStorage).' : 'Browser data (localStorage) backup downloaded.');
  };

  const showAccessDenied = status === 'unauthenticated' || (status === 'authenticated' && userRole !== 'ADMIN');

  if (showAccessDenied) {
    return (
      <div className="admin-page-content p-6">
        <div className="admin-card p-12 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">{ar ? 'غير مصرح بالوصول' : 'Access denied'}</h2>
          <p className="text-gray-600">{ar ? 'هذه الصفحة متاحة فقط للمسؤولين' : 'This page is for administrators only.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page-content">
      <div className="space-y-8 p-6">
        <AdminPageHeader
          title={ar ? 'إدارة البيانات والنسخ الاحتياطي' : 'Data management & backup'}
          subtitle={
            ar
              ? 'تصفير قاعدة البيانات (مع الإبقاء على العقارات)، نسخ احتياطي واستعادة، وتصفير بيانات المتصفح التشغيلية'
              : 'Reset server DB (keep properties), backup/restore, and clear browser operational data'
          }
        />

        {/* رمز الحماية الموحّد */}
        <div className="admin-card p-6 sm:p-8 border-2 border-slate-200">
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            {ar ? 'رمز الحماية (الخادم)' : 'Security PIN (server)'}
          </h2>
          <p className="text-gray-600 text-sm mb-4">
            {ar
              ? 'يُعرَّف على الخادم كمتغير ADMIN_DATA_RESET_PIN (8 أحرف فأكثر). يُطلب لتصفير قاعدة البيانات والنسخ الاحتياطي واستعادته.'
              : 'Set as ADMIN_DATA_RESET_PIN in server environment (8+ chars). Required for DB reset, backup, and restore.'}
          </p>
          <input
            type="password"
            autoComplete="off"
            value={securityPin}
            onChange={(e) => setSecurityPin(e.target.value)}
            placeholder={ar ? 'أدخل رمز الحماية' : 'Enter security PIN'}
            className="admin-input w-full max-w-md border-2 border-slate-300 rounded-xl px-4 py-2.5"
          />
        </div>

        {/* تصفير قاعدة البيانات — الخادم */}
        <div className="admin-card p-6 sm:p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
            <span className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-xl">⛔</span>
            {ar ? 'تصفير قاعدة البيانات (الإبقاء على العقارات)' : 'Reset database (keep properties only)'}
          </h2>
          <p className="text-gray-600 text-sm mb-4">
            {ar
              ? 'يحذف المستخدمين والحجوزات ودفتر العناوين والعقود والمحاسبة وغيرها، ويُبقي صفوف العقارات فقط (دون ربط مالك/منشئ). يُنشئ مستخدم إدارة جديداً. لا يمكن التراجع.'
              : 'Deletes users, bookings, address book, contracts, accounting, etc. Keeps property rows only (unlinks owner/creator). Creates a new admin user. Irreversible.'}
          </p>
          {serverMessage && (
            <div className="mb-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">{serverMessage}</div>
          )}
          {serverError && (
            <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm">{serverError}</div>
          )}
          {resetDone !== null && (
            <div className="mb-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
              {ar ? `تم تصفير المتصفح: ${resetDone} مفتاحاً.` : `Browser keys cleared: ${resetDone}.`}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            {!serverResetConfirm ? (
              <button
                type="button"
                disabled={serverBusy}
                onClick={() => {
                  setServerResetConfirm(true);
                  setServerError(null);
                }}
                className="px-5 py-2.5 rounded-xl font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {ar ? 'بدء تصفير قاعدة البيانات' : 'Start database reset'}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={serverBusy}
                  onClick={() => void handleServerReset()}
                  className="px-5 py-2.5 rounded-xl font-semibold bg-red-700 text-white hover:bg-red-800 disabled:opacity-50 transition-colors"
                >
                  {serverBusy ? (ar ? 'جاري التنفيذ…' : 'Working…') : ar ? 'تأكيد تصفير الخادم' : 'Confirm server reset'}
                </button>
                <button
                  type="button"
                  disabled={serverBusy}
                  onClick={() => setServerResetConfirm(false)}
                  className="px-5 py-2.5 rounded-xl font-semibold bg-gray-200 text-gray-800 hover:bg-gray-300 transition-colors"
                >
                  {ar ? 'إلغاء' : 'Cancel'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* نسخ احتياطي / استعادة — الخادم */}
        <div className="admin-card p-6 sm:p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
            <span className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-xl">💾</span>
            {ar ? 'نسخ احتياطي واستعادة (قاعدة البيانات)' : 'Backup & restore (PostgreSQL)'}
          </h2>
          <p className="text-gray-600 text-sm mb-4">
            {ar
              ? 'تنزيل لقطة JSON كاملة من الخادم، أو رفع ملف لقطة سابقة لاستعادة كل البيانات (يستبدل المحتوى الحالي).'
              : 'Download a full JSON snapshot from the server, or upload a previous snapshot to replace the current database.'}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={serverBusy}
              onClick={() => void handleServerBackup()}
              className="px-5 py-2.5 rounded-xl font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {ar ? 'تنزيل نسخة احتياطية (الخادم)' : 'Download server backup'}
            </button>
            <button
              type="button"
              disabled={serverBusy}
              onClick={() => restoreInputRef.current?.click()}
              className="px-5 py-2.5 rounded-xl font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {ar ? 'رفع واستعادة نسخة' : 'Upload & restore'}
            </button>
            <input
              ref={restoreInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleServerRestore(f);
              }}
            />
          </div>
        </div>

        {/* تصفير بيانات المتصفح التشغيلية + نسخ محلي */}
        <div className="admin-card p-6 sm:p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
            <span className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-xl">⚠️</span>
            {ar ? 'بيانات المتصفح (localStorage) — تشغيلية' : 'Browser data (localStorage) — operational'}
          </h2>
          <p className="text-gray-600 text-sm mb-4">
            {ar
              ? 'حجوزات وعقود وقيود محلية في المتصفح فقط — منفصلة عن قاعدة البيانات على الخادم. لا يُطلب رمز الحماية للتصفير المحلي.'
              : 'Local bookings/contracts in the browser only — separate from the server database. No PIN required for local reset.'}
          </p>
          {resetError && (
            <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm">{resetError}</div>
          )}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <button
              type="button"
              onClick={handleLocalBackupDownload}
              className="px-5 py-2.5 rounded-xl font-semibold bg-slate-700 text-white hover:bg-slate-800 transition-colors"
            >
              {ar ? 'تنزيل نسخة المتصفح' : 'Download browser backup'}
            </button>
            <label className="px-5 py-2.5 rounded-xl font-semibold bg-slate-500 text-white hover:bg-slate-600 cursor-pointer transition-colors">
              {ar ? 'استيراد إلى المتصفح' : 'Import to browser'}
              <input
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    const r = importBackup(String(reader.result));
                    if (r.success) {
                      setServerMessage(ar ? `استُعيدت ${r.restored} مفتاحاً.` : `Restored ${r.restored} keys.`);
                      setTimeout(() => window.location.reload(), 1500);
                    } else {
                      setResetError(r.error || (ar ? 'فشل الاستيراد' : 'Import failed'));
                    }
                  };
                  reader.readAsText(f);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t border-gray-200 pt-6">
            <span className="text-sm text-gray-500 w-full mb-1">{ar ? 'تصفير التشغيل المحلي فقط:' : 'Reset local operational data only:'}</span>
            {!localResetConfirm ? (
              <button
                type="button"
                onClick={() => {
                  setLocalResetConfirm(true);
                  setResetError(null);
                }}
                className="px-5 py-2.5 rounded-xl font-semibold bg-amber-500 text-white hover:bg-amber-600 transition-colors"
              >
                {ar ? 'تصفير البيانات التشغيلية (المتصفح)' : 'Reset operational data (browser)'}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleResetLocal}
                  className="px-5 py-2.5 rounded-xl font-semibold bg-amber-600 text-white hover:bg-amber-700 transition-colors"
                >
                  {ar ? 'تأكيد تصفير المتصفح' : 'Confirm browser reset'}
                </button>
                <button
                  type="button"
                  onClick={() => setLocalResetConfirm(false)}
                  className="px-5 py-2.5 rounded-xl font-semibold bg-gray-200 text-gray-800 hover:bg-gray-300 transition-colors"
                >
                  {ar ? 'إلغاء' : 'Cancel'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
