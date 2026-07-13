'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSubpageShell from '@/components/admin/AdminSubpageShell';
import RealEstateContractsTable from '@/components/admin/real-estate/RealEstateContractsTable';
import Icon from '@/components/icons/Icon';

export default function RealEstateContractsPage() {
  const params = useParams();
  const locale = ((params?.locale as string) || 'ar') as 'ar' | 'en';
  const ar = locale === 'ar';
  const { data: session, status } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const allowed =
    role === 'ADMIN' ||
    role === 'SUPER_ADMIN' ||
    role === 'COMPANY' ||
    role === 'ORG_MANAGER';

  if (status === 'loading') {
    return (
      <AdminSubpageShell>
        <div className="flex items-center justify-center min-h-[40vh] text-sm opacity-70">
          {ar ? 'جاري التحميل…' : 'Loading…'}
        </div>
      </AdminSubpageShell>
    );
  }

  if (!allowed) {
    return (
      <AdminSubpageShell>
        <AdminPageHeader
          title={ar ? 'سجل العقود' : 'Contracts registry'}
          subtitle={ar ? 'هذه الصفحة للمديرين فقط.' : 'This page is for administrators only.'}
        />
        <p className="text-sm opacity-80">
          <Link href={`/${locale}/admin`} className="admin-accent-text font-semibold hover:underline">
            {ar ? '← العودة للوحة التحكم' : '← Back to dashboard'}
          </Link>
        </p>
      </AdminSubpageShell>
    );
  }

  return (
    <AdminSubpageShell className="admin-real-estate-contracts-page">
      <AdminPageHeader
        compact
        title={ar ? 'سجل العقود المحفوظة' : 'Saved contracts registry'}
        subtitle={
          ar
            ? 'قائمة العقود من KV — بحث، فلترة، تجديد، وطباعة رسمية'
            : 'Contracts from KV — search, filter, renew, and official print'
        }
        actions={
          <>
            <Link
              href={`/${locale}/admin/real-estate-dashboard`}
              prefetch
              className="admin-btn admin-btn-primary inline-flex items-center gap-2"
            >
              <Icon name="dashboard" className="w-4 h-4" aria-hidden />
              {ar ? 'لوحة العقارات' : 'Real estate dashboard'}
            </Link>
            <Link
              href={`/${locale}/admin/real-estate-system`}
              prefetch
              className="admin-btn admin-btn-secondary inline-flex items-center gap-2"
            >
              <Icon name="home" className="w-4 h-4" aria-hidden />
              {ar ? 'الوحدات التشغيلية' : 'Operations modules'}
            </Link>
            <Link href={`/${locale}/admin`} className="admin-btn admin-btn-ghost inline-flex items-center gap-2">
              <Icon name={ar ? 'chevronRight' : 'chevronLeft'} className="w-4 h-4" aria-hidden />
              {ar ? 'لوحة التحكم' : 'Dashboard'}
            </Link>
          </>
        }
      />

      <RealEstateContractsTable locale={locale} />
    </AdminSubpageShell>
  );
}
