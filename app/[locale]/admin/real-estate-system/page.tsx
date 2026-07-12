'use client';

import { useRef } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSubpageShell from '@/components/admin/AdminSubpageShell';
import Icon from '@/components/icons/Icon';
import Link from 'next/link';

const LEGACY_APP_SRC = '/api/admin/legacy-real-estate/bhd-real-estate.html';

export default function RealEstateSystemPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';
  const { data: session, status } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const allowed = role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'COMPANY' || role === 'ORG_MANAGER';
  const iframeRef = useRef<HTMLIFrameElement>(null);

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
        title={ar ? 'نظام إدارة العقارات' : 'Real estate management system'}
        subtitle={
          ar
            ? 'النسخة التشغيلية الكاملة (عقود، وحدات، حجوزات، محاسبة) — تُدمج تدريجياً في الموقع'
            : 'Full operational system (contracts, units, bookings, accounting) — merging into the site over time'
        }
        actions={
          <>
            <a
              href={LEGACY_APP_SRC}
              target="_blank"
              rel="noopener noreferrer"
              className="admin-btn admin-btn-secondary inline-flex items-center gap-2"
            >
              <Icon name="externalLink" className="w-4 h-4" aria-hidden />
              {ar ? 'نافذة جديدة' : 'New window'}
            </a>
            <Link href={`/${locale}/admin`} className="admin-btn admin-btn-ghost inline-flex items-center gap-2">
              <Icon name={ar ? 'chevronRight' : 'chevronLeft'} className="w-4 h-4" aria-hidden />
              {ar ? 'لوحة التحكم' : 'Dashboard'}
            </Link>
          </>
        }
      />
      <iframe
        ref={iframeRef}
        src={`${LEGACY_APP_SRC}?mode=dashboard`}
        title={ar ? 'نظام إدارة العقارات' : 'Real estate management system'}
        className="admin-real-estate-legacy-frame"
        allow="fullscreen"
      />
    </AdminSubpageShell>
  );
}
