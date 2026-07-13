'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSubpageShell from '@/components/admin/AdminSubpageShell';
import Icon from '@/components/icons/Icon';
import RealEstateDashboardKpis from '@/components/admin/real-estate/RealEstateDashboardKpis';
import RealEstateModuleHub from '@/components/admin/real-estate/RealEstateModuleHub';
import RealEstateDashboardCalendar from '@/components/admin/real-estate/RealEstateDashboardCalendar';
import RealEstateUnitsTable from '@/components/admin/real-estate/RealEstateUnitsTable';
import type { RealEstateDashboardStats } from '@/lib/real-estate/dashboardStats';

const LEGACY_IFRAME_SRC = '/api/admin/legacy-real-estate/bhd-real-estate.html?mode=dashboard';

type SummaryResponse = {
  stats: RealEstateDashboardStats;
  syncedAt: string;
};

export default function RealEstateDashboardClient() {
  const params = useParams();
  const locale = ((params?.locale as string) || 'ar') as 'ar' | 'en';
  const ar = locale === 'ar';
  const { data: session, status } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const allowed =
    role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'COMPANY' || role === 'ORG_MANAGER';

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<RealEstateDashboardStats | null>(null);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/real-estate-dashboard/summary', {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('summary failed');
      const json = (await res.json()) as SummaryResponse;
      setStats(json.stats);
      setSyncedAt(json.syncedAt);
    } catch {
      setStats(null);
      setSyncedAt(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated' && allowed) void loadSummary();
  }, [status, allowed, loadSummary]);

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
          title={ar ? 'لوحة العقارات' : 'Real estate dashboard'}
          subtitle={ar ? 'هذه الصفحة للمديرين فقط.' : 'This page is for administrators only.'}
        />
        <Link href={`/${locale}/admin`} className="admin-accent-text text-sm font-semibold hover:underline">
          {ar ? '← العودة للوحة التحكم' : '← Back to dashboard'}
        </Link>
      </AdminSubpageShell>
    );
  }

  return (
    <AdminSubpageShell className="admin-real-estate-legacy-page">
      <AdminPageHeader
        compact
        title={ar ? 'لوحة العقارات' : 'Real estate dashboard'}
        subtitle={
          ar
            ? 'ملخص فوري + تقويم + سجل الوحدات — بدون تحميل النظام القديم بالكامل'
            : 'Instant summary + calendar + units registry — without loading the full legacy app'
        }
        actions={
          <>
            <button
              type="button"
              onClick={() => void loadSummary()}
              className="admin-btn admin-btn-secondary inline-flex items-center gap-2"
            >
              <Icon name="arrowPath" className="w-4 h-4" aria-hidden />
              {ar ? 'تحديث الملخص' : 'Refresh summary'}
            </button>
            <a
              href={LEGACY_IFRAME_SRC}
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

      {syncedAt ? (
        <p className="text-xs opacity-60 mb-4" dir="ltr">
          {ar ? 'آخر مزامنة: ' : 'Last sync: '}
          {new Date(syncedAt).toLocaleString(locale === 'ar' ? 'ar-OM' : 'en-GB')}
        </p>
      ) : null}

      <RealEstateDashboardKpis locale={locale} stats={stats} loading={loading} />
      <RealEstateModuleHub locale={locale} stats={stats} />
      <RealEstateDashboardCalendar locale={locale} />
      <RealEstateUnitsTable locale={locale} />
    </AdminSubpageShell>
  );
}
