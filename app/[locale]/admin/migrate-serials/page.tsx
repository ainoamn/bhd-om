'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

type MigrateResult = {
  users: number;
  properties: number;
  projects: number;
  serialHistory: number;
  journalEntries: number;
  accountingDocuments: number;
  addressBookContacts: number;
  bookingStorageRows: number;
  dryRun: boolean;
};

export default function AdminMigrateSerialsPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';
  const { data: session, status } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const allowed = role === 'ADMIN' || role === 'SUPER_ADMIN';

  const [loading, setLoading] = useState<'dry' | 'run' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MigrateResult | null>(null);
  const [confirmText, setConfirmText] = useState('');

  const run = async (dryRun: boolean) => {
    setError(null);
    setResult(null);
    setLoading(dryRun ? 'dry' : 'run');
    try {
      const res = await fetch('/api/admin/migrate-serials-bhd', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify(dryRun ? { dryRun: true } : { dryRun: false, confirm: 'BHD-MIGRATE' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data?.error === 'string' ? data.error : data?.hint || `HTTP ${res.status}`);
        return;
      }
      if (data?.result) setResult(data.result as MigrateResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setLoading(null);
    }
  };

  if (status === 'loading') {
    return (
      <div className="p-12 text-center text-gray-500">{ar ? 'جاري التحميل...' : 'Loading...'}</div>
    );
  }

  if (!allowed) {
    return (
      <div className="space-y-6">
        <AdminPageHeader
          title={ar ? 'ترحيل الأرقام (BHD)' : 'Migrate serials (BHD)'}
          subtitle={ar ? 'للمدير فقط' : 'Admin only'}
        />
        <div className="admin-card p-8 text-center text-amber-800">
          {ar ? 'يجب تسجيل الدخول كمدير (ADMIN أو SUPER_ADMIN).' : 'Sign in as ADMIN or SUPER_ADMIN.'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <AdminPageHeader
        title={ar ? 'ترحيل الأرقام إلى BHD' : 'Migrate serials to BHD'}
        subtitle={
          ar
            ? 'تشغيل على قاعدة بيانات الموقع الحالي (إنتاج). ابدأ بمعاينة بدون كتابة.'
            : 'Runs against the current site database. Start with dry run (no writes).'
        }
      />

      <div className="admin-card admin-card-body space-y-4">
        <p className="text-sm text-gray-600 leading-relaxed">
          {ar
            ? 'يحدّث المستخدمين والعقارات والمشاريع والمحاسبة ودفتر العناوين والحجوزات وجداول العداد. استخدم «معاينة» أولاً للتحقق من الأعداد دون تعديل البيانات.'
            : 'Updates users, properties, projects, accounting, address book, bookings, and counters. Use Preview first to see counts without writes.'}
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => void run(true)}
            className="admin-btn-secondary px-4 py-2 rounded-xl font-semibold disabled:opacity-50"
          >
            {loading === 'dry' ? '…' : ar ? 'معاينة (بدون كتابة)' : 'Preview (dry run)'}
          </button>
        </div>

        <div className="border-t border-gray-100 pt-4 space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {ar ? 'للتنفيذ الفعلي: اكتب بالضبط' : 'For real run, type exactly:'}{' '}
            <code className="bg-gray-100 px-1 rounded">BHD-MIGRATE</code>
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="admin-input w-full max-w-md"
            placeholder="BHD-MIGRATE"
            autoComplete="off"
          />
          <button
            type="button"
            disabled={loading !== null || confirmText.trim() !== 'BHD-MIGRATE'}
            onClick={() => void run(false)}
            className="admin-btn-primary px-4 py-2 rounded-xl font-semibold disabled:opacity-50 bg-red-700 hover:bg-red-800"
          >
            {loading === 'run' ? '…' : ar ? 'تنفيذ الترحيل على قاعدة البيانات' : 'Run migration on database'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 whitespace-pre-wrap">
          {error}
        </div>
      )}

      {result && (
        <div className="admin-card admin-card-body">
          <h3 className="font-bold text-gray-900 mb-2">
            {result.dryRun ? (ar ? 'نتيجة المعاينة' : 'Preview result') : ar ? 'تم التنفيذ' : 'Done'}
          </h3>
          <pre className="text-xs font-mono bg-gray-50 p-4 rounded-lg overflow-x-auto text-left" dir="ltr">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
