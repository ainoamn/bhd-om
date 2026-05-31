'use client';

import { useParams } from 'next/navigation';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import {
  resetAllOperationalData,
  clearClientCachesAfterServerDbReset,
} from '@/lib/data/backup';

const PURGE_LEGACY_CONFIRM = 'PURGE-LEGACY-BOOKING-SETTINGS';

type LegacyBookingSettingsStatus = {
  legacyDocumentCount: number;
  legacyCheckBookingCount: number;
  legacyCheckRowCount: number;
  tableDocumentCount: number;
  tableCheckCount: number;
  legacyDocumentsPresent: boolean;
  legacyChecksPresent: boolean;
  fullyMigrated: boolean;
};

type ProductionOverall = {
  dbConnected: boolean;
  paymentProductionReady: boolean;
  legacyFullyMigrated: boolean;
  coreEnvConfigured: boolean;
};

type DatabaseHealth = {
  ok: boolean;
  latencyMs?: number;
  error?: string;
};

type PaymentGatewayStatus = {
  provider: 'mock' | 'thawani';
  thawaniConfigured: boolean;
  secretKeySet: boolean;
  publishableKeySet: boolean;
  webhookSecretSet: boolean;
  webhookPath: string;
  webhookUrl: string;
  webhookHeader: string;
  successUrl: string;
  cancelUrl: string;
  nextAuthUrlSet: boolean;
  siteBase: string | null;
  productionReady: boolean;
  checks: Array<{ id: string; ok: boolean; labelAr: string; labelEn: string }>;
};

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
  const [pinCurrent, setPinCurrent] = useState('');
  const [pinNew, setPinNew] = useState('');
  const [pinRepeat, setPinRepeat] = useState('');
  const [pinChangeMsg, setPinChangeMsg] = useState<string | null>(null);
  const [pinChangeErr, setPinChangeErr] = useState<string | null>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const [legacyStatus, setLegacyStatus] = useState<LegacyBookingSettingsStatus | null>(null);
  const [legacyBusy, setLegacyBusy] = useState(false);
  const [legacyMsg, setLegacyMsg] = useState<string | null>(null);
  const [legacyErr, setLegacyErr] = useState<string | null>(null);
  const [legacyPurgeConfirm, setLegacyPurgeConfirm] = useState(false);
  const [legacyPurgeConfirmText, setLegacyPurgeConfirmText] = useState('');
  const [paymentGw, setPaymentGw] = useState<PaymentGatewayStatus | null>(null);
  const [dbHealth, setDbHealth] = useState<DatabaseHealth | null>(null);
  const [overallReadiness, setOverallReadiness] = useState<ProductionOverall | null>(null);
  const [readinessLoading, setReadinessLoading] = useState(false);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);

  const loadProductionReadiness = useCallback(async () => {
    setReadinessLoading(true);
    try {
      const res = await fetch('/api/admin/production-readiness', { cache: 'no-store', credentials: 'include' });
      if (!res.ok) return;
      const data = (await res.json()) as {
        payment?: PaymentGatewayStatus;
        legacy?: LegacyBookingSettingsStatus;
        database?: DatabaseHealth;
        overall?: ProductionOverall;
      };
      if (data.payment) setPaymentGw(data.payment);
      if (data.legacy) setLegacyStatus(data.legacy);
      if (data.database) setDbHealth(data.database);
      if (data.overall) setOverallReadiness(data.overall);
    } catch {
      /* ignore */
    } finally {
      setReadinessLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status !== 'authenticated') return;
    if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') return;
    void loadProductionReadiness();
  }, [status, userRole, loadProductionReadiness]);

  const handleLegacyBackfill = async () => {
    setLegacyBusy(true);
    setLegacyErr(null);
    setLegacyMsg(null);
    try {
      const res = await fetch('/api/admin/legacy-booking-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'backfill' }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        documentsMigrated?: number;
        checksMigrated?: number;
        status?: LegacyBookingSettingsStatus;
      };
      if (!res.ok) {
        setLegacyErr(data.error || (ar ? 'فشل الترحيل' : 'Backfill failed'));
        return;
      }
      if (data.status) setLegacyStatus(data.status);
      setLegacyMsg(
        ar
          ? `تم الترحيل: ${data.documentsMigrated ?? 0} مستند، ${data.checksMigrated ?? 0} شيك.`
          : `Migrated: ${data.documentsMigrated ?? 0} documents, ${data.checksMigrated ?? 0} checks.`
      );
    } catch {
      setLegacyErr(ar ? 'خطأ شبكة' : 'Network error');
    } finally {
      setLegacyBusy(false);
    }
  };

  const handleLegacyPurge = async () => {
    if (!legacyPurgeConfirm || legacyPurgeConfirmText.trim() !== PURGE_LEGACY_CONFIRM) return;
    setLegacyBusy(true);
    setLegacyErr(null);
    setLegacyMsg(null);
    try {
      const res = await fetch('/api/admin/legacy-booking-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'purge', confirm: PURGE_LEGACY_CONFIRM }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        removed?: string[];
        status?: LegacyBookingSettingsStatus;
        verify?: { missingDocuments?: number; missingChecks?: number };
      };
      if (!res.ok) {
        if (data.verify) {
          setLegacyErr(
            ar
              ? `لم يكتمل الترحيل: ${data.verify.missingDocuments ?? 0} مستند، ${data.verify.missingChecks ?? 0} شيك ناقص.`
              : `Migration incomplete: ${data.verify.missingDocuments ?? 0} docs, ${data.verify.missingChecks ?? 0} checks missing.`
          );
        } else {
          setLegacyErr(data.error || (ar ? 'فشل الحذف' : 'Purge failed'));
        }
        return;
      }
      if (data.status) setLegacyStatus(data.status);
      setLegacyMsg(
        ar
          ? `تم حذف مفاتيح legacy: ${(data.removed || []).join(', ') || '—'}`
          : `Removed legacy keys: ${(data.removed || []).join(', ') || '—'}`
      );
      setLegacyPurgeConfirm(false);
      setLegacyPurgeConfirmText('');
    } catch {
      setLegacyErr(ar ? 'خطأ شبكة' : 'Network error');
    } finally {
      setLegacyBusy(false);
    }
  };

  const copyToClipboard = async (text: string, okMsg: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyMsg(okMsg);
      setTimeout(() => setCopyMsg(null), 2500);
    } catch {
      setCopyMsg(ar ? 'تعذر النسخ' : 'Copy failed');
      setTimeout(() => setCopyMsg(null), 2500);
    }
  };

  const copyWebhookSetup = () => {
    if (!paymentGw?.webhookUrl) return;
    const block = [
      `Webhook URL: ${paymentGw.webhookUrl}`,
      `Header: ${paymentGw.webhookHeader} = <THAWANI_WEBHOOK_SECRET value in Vercel>`,
      `Success URL: ${paymentGw.successUrl || '—'}`,
      `Cancel URL: ${paymentGw.cancelUrl || '—'}`,
    ].join('\n');
    void copyToClipboard(block, ar ? 'تم نسخ إعداد Webhook' : 'Webhook setup copied');
  };

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
        if (data.error === 'INVALID_PIN') {
          setServerError(ar ? 'رمز الحماية غير صحيح' : 'Invalid security PIN');
        } else {
          setServerError(ar ? 'فشل التصفير على الخادم' : 'Server reset failed');
        }
        return;
      }
      /** حجوزات/عقود/مسودات محلية (`bhd_property_bookings` إلخ) + دفتر العناوين — بدونها يبقى البريد نفسه مرتبطاً بحجوزات قديمة في المتصفح */
      clearClientCachesAfterServerDbReset();
      setServerMessage(
        ar
          ? `تم تصفير قاعدة البيانات (العقارات محفوظة) ومسح الحجوزات/العقود والدفتر المحلي في هذا المتصفح. تسجيل الدخول كـ: ${data.adminEmail ?? '—'} — سيتم تسجيل الخروج.`
          : `Database reset (properties kept) and local bookings/contracts/address book cleared in this browser. Sign in as: ${data.adminEmail ?? '—'} — signing out...`
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
        if (data.error === 'INVALID_PIN') {
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
        if (data.error === 'INVALID_PIN') {
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

  const handleChangePin = async () => {
    setPinChangeErr(null);
    setPinChangeMsg(null);
    if (!pinCurrent.trim() || !pinNew.trim() || !pinRepeat.trim()) {
      setPinChangeErr(ar ? 'املأ كل الحقول' : 'Fill all fields');
      return;
    }
    if (pinNew !== pinRepeat) {
      setPinChangeErr(ar ? 'الرمز الجديد وتكراره غير متطابقين' : 'New PIN and repeat do not match');
      return;
    }
    setServerBusy(true);
    try {
      const res = await fetch('/api/admin/data/change-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentPin: pinCurrent,
          newPin: pinNew,
          newPinRepeat: pinRepeat,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
      if (!res.ok) {
        const code = data.code;
        if (code === 'INVALID_CURRENT') setPinChangeErr(ar ? 'الرمز الحالي غير صحيح' : 'Current PIN is wrong');
        else if (code === 'MISMATCH') setPinChangeErr(ar ? 'التكرار غير متطابق' : 'Mismatch');
        else if (code === 'SHORT') setPinChangeErr(ar ? 'الرمز الجديد يجب أن يكون 8 أحرف فأكثر' : 'New PIN must be at least 8 characters');
        else setPinChangeErr(ar ? 'فشل تغيير الرمز' : 'Failed to change PIN');
        return;
      }
      setPinChangeMsg(ar ? 'تم تغيير رمز الحماية بنجاح.' : 'Security PIN updated successfully.');
      setPinCurrent('');
      setPinNew('');
      setPinRepeat('');
    } catch {
      setPinChangeErr(ar ? 'خطأ شبكة' : 'Network error');
    } finally {
      setServerBusy(false);
    }
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
                {(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') && (
          <div className="admin-card p-6 sm:p-8 border-2 border-[#8B6F47]/20 bg-gradient-to-br from-amber-50/80 to-white">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-10 h-10 rounded-xl bg-[#8B6F47]/15 flex items-center justify-center text-xl">🚀</span>
                  {ar ? 'جاهزية الإنتاج' : 'Production readiness'}
                </h2>
                <p className="text-gray-600 text-sm mt-1">
                  {ar ? 'ملخص حي من هذا السيرفر — حدّث بعد ضبط Vercel أو الهجرات.' : 'Live summary from this server — refresh after Vercel env or migrations.'}
                </p>
              </div>
              <button
                type="button"
                disabled={readinessLoading}
                onClick={() => void loadProductionReadiness()}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#8B6F47] text-white hover:bg-[#6B5435] disabled:opacity-50 transition-colors"
              >
                {readinessLoading ? (ar ? 'جاري التحديث…' : 'Refreshing…') : ar ? 'تحديث' : 'Refresh'}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <div className={`rounded-xl p-4 border ${dbHealth?.ok ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                <p className="text-xs text-gray-600 mb-1">{ar ? 'قاعدة البيانات' : 'Database'}</p>
                <p className={`font-bold ${dbHealth?.ok ? 'text-emerald-800' : 'text-red-800'}`}>
                  {dbHealth?.ok
                    ? ar
                      ? `متصل${dbHealth.latencyMs != null ? ` (${dbHealth.latencyMs}ms)` : ''}`
                      : `Connected${dbHealth.latencyMs != null ? ` (${dbHealth.latencyMs}ms)` : ''}`
                    : ar
                      ? 'غير متصل'
                      : 'Disconnected'}
                </p>
              </div>
              <div className={`rounded-xl p-4 border ${overallReadiness?.coreEnvConfigured ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                <p className="text-xs text-gray-600 mb-1">{ar ? 'متغيرات أساسية' : 'Core env'}</p>
                <p className={`font-bold ${overallReadiness?.coreEnvConfigured ? 'text-emerald-800' : 'text-amber-800'}`}>
                  {overallReadiness?.coreEnvConfigured ? (ar ? 'مضبوطة' : 'Configured') : ar ? 'ناقصة' : 'Incomplete'}
                </p>
              </div>
              <div className={`rounded-xl p-4 border ${overallReadiness?.paymentProductionReady ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                <p className="text-xs text-gray-600 mb-1">Thawani</p>
                <p className={`font-bold ${overallReadiness?.paymentProductionReady ? 'text-emerald-800' : 'text-amber-800'}`}>
                  {overallReadiness?.paymentProductionReady
                    ? ar ? 'جاهز' : 'Ready'
                    : paymentGw?.provider === 'mock'
                      ? 'mock'
                      : ar ? 'جزئي' : 'Partial'}
                </p>
              </div>
              <div className={`rounded-xl p-4 border ${overallReadiness?.legacyFullyMigrated ? 'bg-emerald-50 border-emerald-200' : 'bg-violet-50 border-violet-200'}`}>
                <p className="text-xs text-gray-600 mb-1">{ar ? 'Legacy booking' : 'Legacy booking'}</p>
                <p className={`font-bold ${overallReadiness?.legacyFullyMigrated ? 'text-emerald-800' : 'text-violet-800'}`}>
                  {overallReadiness?.legacyFullyMigrated ? (ar ? 'مكتمل' : 'Migrated') : ar ? 'يحتاج ترحيل' : 'Needs backfill'}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500 flex flex-wrap gap-x-3 gap-y-1">
              <a href="/api/check-env" target="_blank" rel="noopener noreferrer" className="text-[#8B6F47] underline">
                /api/check-env
              </a>
              <a href="/api/check-db" target="_blank" rel="noopener noreferrer" className="text-[#8B6F47] underline">
                /api/check-db
              </a>
              {paymentGw?.webhookUrl && (
                <button type="button" onClick={copyWebhookSetup} className="text-[#8B6F47] underline font-semibold">
                  {ar ? 'نسخ إعداد Webhook' : 'Copy webhook setup'}
                </button>
              )}
            </p>
          </div>
        )}

<div className="admin-card p-6 sm:p-8 border-2 border-slate-200">
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            {ar ? 'رمز الحماية (الخادم)' : 'Security PIN (server)'}
          </h2>
          <p className="text-gray-600 text-sm mb-4">
            {ar
              ? 'يُخزَّن الرمز في قاعدة البيانات (مشفّر). الافتراضي بعد أول تشغيل أو بعد تصفير قاعدة البيانات: Abdul100189@ — يُفضّل تغييره من القسم التالي. يُستخدم لتصفير الخادم والنسخ الاحتياطي والاستعادة. اختياري: يمكن تعيين ADMIN_DATA_RESET_PIN مرة واحدة لأول إنشاء للسجل إن لم يوجد.'
              : 'PIN is stored hashed in the database. Default after first boot or after DB reset: Abdul100189@ — change it below. Used for server reset, backup, restore. Optional: ADMIN_DATA_RESET_PIN seeds the first record if none exists.'}
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

        {/* تغيير رمز الحماية */}
        <div className="admin-card p-6 sm:p-8 border-2 border-emerald-100">
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            {ar ? 'تغيير رمز الحماية' : 'Change security PIN'}
          </h2>
          <p className="text-gray-600 text-sm mb-4">
            {ar
              ? 'أدخل الرمز الحالي، ثم الرمز الجديد وتأكيده (8 أحرف فأكثر).'
              : 'Enter current PIN, then new PIN and confirmation (min 8 characters).'}
          </p>
          {pinChangeMsg && (
            <div className="mb-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">{pinChangeMsg}</div>
          )}
          {pinChangeErr && (
            <div className="mb-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm">{pinChangeErr}</div>
          )}
          <div className="grid gap-3 max-w-md">
            <input
              type="password"
              autoComplete="off"
              value={pinCurrent}
              onChange={(e) => setPinCurrent(e.target.value)}
              placeholder={ar ? 'الرمز الحالي' : 'Current PIN'}
              className="admin-input w-full border-2 border-slate-300 rounded-xl px-4 py-2.5"
            />
            <input
              type="password"
              autoComplete="new-password"
              value={pinNew}
              onChange={(e) => setPinNew(e.target.value)}
              placeholder={ar ? 'الرمز الجديد' : 'New PIN'}
              className="admin-input w-full border-2 border-slate-300 rounded-xl px-4 py-2.5"
            />
            <input
              type="password"
              autoComplete="new-password"
              value={pinRepeat}
              onChange={(e) => setPinRepeat(e.target.value)}
              placeholder={ar ? 'تأكيد الرمز الجديد' : 'Confirm new PIN'}
              className="admin-input w-full border-2 border-slate-300 rounded-xl px-4 py-2.5"
            />
            <button
              type="button"
              disabled={serverBusy}
              onClick={() => void handleChangePin()}
              className="px-5 py-2.5 rounded-xl font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 w-fit"
            >
              {serverBusy ? (ar ? 'جاري الحفظ…' : 'Saving…') : ar ? 'حفظ الرمز الجديد' : 'Save new PIN'}
            </button>
          </div>
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

        {/* قاعدة البيانات — هجرات الإنتاج */}
        {(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') && (
          <div className="admin-card p-6 sm:p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
              <span className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-xl">🗄️</span>
              {ar ? 'قاعدة البيانات (هجرات الإنتاج)' : 'Database (production migrations)'}
            </h2>
            <p className="text-gray-600 text-sm mb-3">
              {ar
                ? 'بعد النشر على Vercel، نفّذ من جهاز متصل بـ DATABASE_URL الإنتاج:'
                : 'After Vercel deploy, run from a machine with production DATABASE_URL:'}
            </p>
            <pre className="text-xs bg-gray-900 text-gray-100 p-4 rounded-xl overflow-x-auto mb-3">
              npm run db:migrate:deploy{'\n'}npm run db:backfill-legacy-booking-settings
            </pre>
            <p className="text-xs text-gray-500">
              {ar ? 'ثم ارجع هنا لـ backfill/purge legacy أدناه.' : 'Then use backfill/purge legacy below.'}
            </p>
          </div>
        )}

        {/* بوابة الدفع */}
        {paymentGw && (
          <div className="admin-card p-6 sm:p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
              <span className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-xl">💳</span>
              {ar ? 'بوابة الدفع' : 'Payment gateway'}
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              {ar
                ? 'مراجعة جاهزية Thawani على هذا السيرفر — اضبط المتغيرات في Vercel ثم webhook.'
                : 'Thawani readiness on this server — set Vercel env vars then configure webhook.'}
            </p>
            {paymentGw.productionReady ? (
              <p className="mb-4 inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
                ✓ {ar ? 'جاهز للإنتاج (Thawani)' : 'Production ready (Thawani)'}
              </p>
            ) : (
              <p className="mb-4 inline-flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                {paymentGw.provider === 'mock'
                  ? ar
                    ? 'وضع mock — أضف مفاتيح Thawani في Vercel'
                    : 'Mock mode — add Thawani keys in Vercel'
                  : ar
                    ? 'Thawani جزئياً — أكمل checklist أدناه'
                    : 'Thawani partial — complete checklist below'}
              </p>
            )}
            {copyMsg && (
              <p className="mb-3 text-sm text-emerald-700 font-medium">{copyMsg}</p>
            )}
            <p className="mb-4 text-xs text-gray-500">
              {ar ? 'تحقق سريع:' : 'Quick check:'}{' '}
              <a href="/api/check-env" target="_blank" rel="noopener noreferrer" className="text-[#8B6F47] underline">
                /api/check-env
              </a>
              {' · '}
              {ar ? 'راجع' : 'See'}{' '}
              <code className="text-xs">docs/PRODUCTION-CHECKLIST.md</code>
            </p>
            <ul className="mb-4 space-y-2">
              {paymentGw.checks.map((c) => (
                <li key={c.id} className="flex items-center gap-2 text-sm">
                  <span className={c.ok ? 'text-emerald-600' : 'text-red-500'}>{c.ok ? '✓' : '✗'}</span>
                  <span className="text-gray-800">{ar ? c.labelAr : c.labelEn}</span>
                </li>
              ))}
            </ul>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-gray-500">{ar ? 'المزود' : 'Provider'}</dt>
                <dd className="font-semibold text-gray-900">{paymentGw.provider}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Thawani</dt>
                <dd className={`font-semibold ${paymentGw.thawaniConfigured ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {paymentGw.thawaniConfigured ? (ar ? 'مُفعّل' : 'Configured') : ar ? 'mock (غير مُعد)' : 'mock (not configured)'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">{ar ? 'Webhook secret' : 'Webhook secret'}</dt>
                <dd className="font-semibold text-gray-900">{paymentGw.webhookSecretSet ? '✓' : '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Secret key</dt>
                <dd className="font-semibold text-gray-900">{paymentGw.secretKeySet ? '✓' : '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Publishable key</dt>
                <dd className="font-semibold text-gray-900">{paymentGw.publishableKeySet ? '✓' : '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">NEXTAUTH_URL</dt>
                <dd className="font-semibold text-gray-900">{paymentGw.nextAuthUrlSet ? '✓' : '—'}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-gray-500">{ar ? 'Webhook (URL كامل)' : 'Webhook (full URL)'}</dt>
                <dd className="font-mono text-xs text-gray-800 break-all">
                  {paymentGw.webhookUrl || paymentGw.webhookPath}
                </dd>
                {paymentGw.webhookUrl && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        void copyToClipboard(
                          paymentGw.webhookUrl,
                          ar ? 'تم نسخ رابط Webhook' : 'Webhook URL copied'
                        )
                      }
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-800"
                    >
                      {ar ? 'نسخ URL' : 'Copy URL'}
                    </button>
                    <p className="text-xs text-gray-500">
                      {ar ? 'Header:' : 'Header:'} <code>{paymentGw.webhookHeader}</code>
                    </p>
                  </div>
                )}
              </div>
              <div className="sm:col-span-2">
                <dt className="text-gray-500">{ar ? 'Success URL' : 'Success URL'}</dt>
                <dd className="font-mono text-xs text-gray-800 break-all">{paymentGw.successUrl || '—'}</dd>
              </div>
            </dl>
          </div>
        )}

        {/* ترحيل legacy مستندات/شيكات الحجز */}
        {(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') && (
          <div className="admin-card p-6 sm:p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
              <span className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center text-xl">📋</span>
              {ar ? 'ترحيل مستندات وشيكات الحجز (legacy)' : 'Booking documents & checks migration (legacy)'}
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              {ar
                ? 'نقل البيانات من AppSetting (booking_documents_settings / booking_checks_settings) إلى الجداول المفهرسة. بعد التحقق يمكن حذف مفاتيح legacy.'
                : 'Move data from AppSetting JSON keys into indexed tables. Purge legacy keys after verification.'}
            </p>
            {legacyMsg && (
              <div className="mb-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">{legacyMsg}</div>
            )}
            {legacyErr && (
              <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm">{legacyErr}</div>
            )}
            {legacyStatus && (
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4 text-sm">
                <div className="rounded-lg bg-gray-50 p-3">
                  <dt className="text-gray-500">{ar ? 'مستندات legacy' : 'Legacy docs'}</dt>
                  <dd className="font-semibold text-gray-900">{legacyStatus.legacyDocumentCount}</dd>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <dt className="text-gray-500">{ar ? 'شيكات legacy' : 'Legacy checks'}</dt>
                  <dd className="font-semibold text-gray-900">{legacyStatus.legacyCheckRowCount}</dd>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <dt className="text-gray-500">{ar ? 'جدول المستندات' : 'Document rows'}</dt>
                  <dd className="font-semibold text-gray-900">{legacyStatus.tableDocumentCount}</dd>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <dt className="text-gray-500">{ar ? 'جدول الشيكات' : 'Check rows'}</dt>
                  <dd className="font-semibold text-gray-900">{legacyStatus.tableCheckCount}</dd>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 col-span-2 sm:col-span-1">
                  <dt className="text-gray-500">{ar ? 'جاهز للحذف' : 'Fully migrated'}</dt>
                  <dd className={`font-semibold ${legacyStatus.fullyMigrated ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {legacyStatus.fullyMigrated ? (ar ? 'نعم' : 'Yes') : ar ? 'لا — شغّل الترحيل' : 'No — run backfill'}
                  </dd>
                </div>
              </dl>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={legacyBusy}
                onClick={() => void handleLegacyBackfill()}
                className="px-5 py-2.5 rounded-xl font-semibold bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
              >
                {legacyBusy ? (ar ? 'جاري الترحيل…' : 'Migrating…') : ar ? 'ترحيل من legacy' : 'Backfill from legacy'}
              </button>
              <button
                type="button"
                disabled={legacyBusy}
                onClick={() => void loadProductionReadiness()}
                className="px-5 py-2.5 rounded-xl font-semibold bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:opacity-50 transition-colors"
              >
                {ar ? 'تحديث الحالة' : 'Refresh status'}
              </button>
              {!legacyPurgeConfirm ? (
                <button
                  type="button"
                  disabled={legacyBusy || !legacyStatus?.fullyMigrated}
                  onClick={() => {
                    setLegacyPurgeConfirm(true);
                    setLegacyErr(null);
                  }}
                  className="px-5 py-2.5 rounded-xl font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {ar ? 'حذف مفاتيح legacy' : 'Purge legacy keys'}
                </button>
              ) : (
                <>
                  <input
                    type="text"
                    value={legacyPurgeConfirmText}
                    onChange={(e) => setLegacyPurgeConfirmText(e.target.value)}
                    placeholder={PURGE_LEGACY_CONFIRM}
                    className="admin-input w-full max-w-md text-sm"
                    aria-label={ar ? 'تأكيد حذف legacy' : 'Confirm legacy purge'}
                  />
                  <button
                    type="button"
                    disabled={legacyBusy || legacyPurgeConfirmText.trim() !== PURGE_LEGACY_CONFIRM}
                    onClick={() => void handleLegacyPurge()}
                    className="px-5 py-2.5 rounded-xl font-semibold bg-red-700 text-white hover:bg-red-800 disabled:opacity-50 transition-colors"
                  >
                    {ar ? 'تأكيد الحذف' : 'Confirm purge'}
                  </button>
                  <button
                    type="button"
                    disabled={legacyBusy}
                    onClick={() => {
                      setLegacyPurgeConfirm(false);
                      setLegacyPurgeConfirmText('');
                    }}
                    className="px-5 py-2.5 rounded-xl font-semibold bg-gray-200 text-gray-800 hover:bg-gray-300 transition-colors"
                  >
                    {ar ? 'إلغاء' : 'Cancel'}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

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
          <div className="mb-6 p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-sm">
            {ar
              ? 'تم إيقاف النسخ المحلي (localStorage) افتراضياً. استخدم النسخ الاحتياطي/الاستعادة من الخادم أعلاه.'
              : 'LocalStorage backup/import is disabled by default. Use server backup/restore above.'}
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
