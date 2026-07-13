'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSubpageShell from '@/components/admin/AdminSubpageShell';
import RealEstateModuleHub from '@/components/admin/real-estate/RealEstateModuleHub';
import Icon from '@/components/icons/Icon';

const LEGACY_FULL = '/api/admin/legacy-real-estate/bhd-real-estate.html';

export default function RealEstateSystemPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';
  const { data: session, status } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const allowed = role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'COMPANY' || role === 'ORG_MANAGER';

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
          title={ar ? 'نظام إدارة العقارات' : 'Real estate management system'}
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
    <AdminSubpageShell className="admin-real-estate-legacy-page">
      <AdminPageHeader
        compact
        title={ar ? 'الوحدات التشغيلية — العقارات' : 'Real estate operations modules'}
        subtitle={
          ar
            ? 'لوحة الوحدات والعقود أصبحت React — افتح الوحدات الأخرى من هنا أو النظام الكامل في نافذة جديدة'
            : 'Units dashboard is now React — open other modules here or the full system in a new window'
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
            <a
              href={`${LEGACY_FULL}?locale=${locale}`}
              target="_blank"
              rel="noopener noreferrer"
              className="admin-btn admin-btn-secondary inline-flex items-center gap-2"
            >
              <Icon name="externalLink" className="w-4 h-4" aria-hidden />
              {ar ? 'النظام الكامل (legacy)' : 'Full system (legacy)'}
            </a>
            <Link href={`/${locale}/admin`} className="admin-btn admin-btn-ghost inline-flex items-center gap-2">
              <Icon name={ar ? 'chevronRight' : 'chevronLeft'} className="w-4 h-4" aria-hidden />
              {ar ? 'لوحة التحكم' : 'Dashboard'}
            </Link>
          </>
        }
      />

      <div className="admin-card p-4 mb-6 border border-[var(--admin-border)] rounded-xl bg-[var(--admin-surface)]">
        <p className="text-sm opacity-85 leading-relaxed">
          {ar
            ? 'تم نقل لوحة الوحدات (KPIs، الجدول، التقويم، التفاصيل، تعبئة/تجديد العقد) إلى صفحة «لوحة العقارات». هذه الصفحة للوصول السريع إلى باقي الوحدات دون iframe.'
            : 'The units dashboard (KPIs, table, calendar, details, contract fill/renew) moved to «Real estate dashboard». This page provides quick access to other modules without an iframe.'}
        </p>
      </div>

      <RealEstateModuleHub locale={locale} stats={null} />
    </AdminSubpageShell>
  );
}
