'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AccountingSection, { type AccountingInitialData } from '@/components/admin/AccountingSection';
import AccountingHelpGuide from '@/components/admin/AccountingHelpGuide';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import Icon from '@/components/icons/Icon';

export default function AdminAccountingClient(props: { initialData: AccountingInitialData }) {
  const { initialData } = props;
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

      <AccountingSection initialData={initialData} />

      {showHelp && <AccountingHelpGuide locale={locale} onClose={() => setShowHelp(false)} />}
    </div>
  );
}
