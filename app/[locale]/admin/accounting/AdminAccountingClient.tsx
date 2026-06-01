'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AccountingSection from '@/components/admin/AccountingSection';
import type { AccountingInitialData } from '@/lib/accounting/types/pageData';
import AccountingHelpGuide from '@/components/admin/AccountingHelpGuide';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import Icon from '@/components/icons/Icon';

export default function AdminAccountingClient(props: {
  initialData?: AccountingInitialData;
  serverLoadError?: string;
}) {
  const { initialData, serverLoadError } = props;
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="admin-page-content">
      <AdminPageHeader
        title={ar ? 'المحاسبة' : 'Accounting'}
        subtitle={
          ar
            ? 'إدارة مالية متكاملة · تقارير · معايير عالمية'
            : 'Integrated finance · reports · global standards'
        }
        actions={
          <div className="admin-toolbar-group flex-wrap justify-end">
            <Link href={`/${locale}/admin/accounting?tab=journal`} prefetch className="admin-btn-primary text-sm !py-2">
              <Icon name="plus" className="w-4 h-4" aria-hidden />
              {ar ? 'قيد يومية' : 'Journal entry'}
            </Link>
            <Link href={`/${locale}/admin/accounting?tab=accounts`} prefetch className="admin-btn-secondary text-sm !py-2">
              <Icon name="archive" className="w-4 h-4" aria-hidden />
              {ar ? 'دليل الحسابات' : 'Chart of accounts'}
            </Link>
            <Link href={`/${locale}/admin/accounting?tab=reports`} prefetch className="admin-btn-secondary text-sm !py-2">
              <Icon name="chartBar" className="w-4 h-4" aria-hidden />
              {ar ? 'التقارير' : 'Reports'}
            </Link>
            <button type="button" onClick={() => setShowHelp(true)} className="admin-btn-secondary text-sm !py-2">
              <Icon name="information" className="w-4 h-4" aria-hidden />
              {ar ? 'دليل الاستخدام' : 'Guide'}
            </button>
          </div>
        }
        actionsClassName="admin-toolbar-group--end max-w-full"
      />

      {serverLoadError && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">
          <p className="font-semibold">{ar ? 'تعذّر تحميل بيانات المحاسبة من الخادم' : 'Could not load accounting data from server'}</p>
          <p className="mt-1 text-xs text-amber-800">{serverLoadError}</p>
          <p className="mt-2 text-xs text-amber-700">
            {ar
              ? 'سيتم محاولة التحميل من API. إن استمر الخطأ نفّذ migrations على قاعدة البيانات.'
              : 'Retrying via API. If the error persists, apply database migrations on the server.'}
          </p>
        </div>
      )}

      <AccountingSection initialData={initialData} />

      {showHelp && <AccountingHelpGuide locale={locale} onClose={() => setShowHelp(false)} />}
    </div>
  );
}
