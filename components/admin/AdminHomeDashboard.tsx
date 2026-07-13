'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import Icon from '@/components/icons/Icon';
import AiInsightPanel from '@/components/admin/AiInsightPanel';
import type { ActivityItem, DashboardInsight, PriorityItem } from '@/lib/admin/dashboardInsights';
import type { IconName } from '@/lib/icons';

type Props = {
  locale: string;
  userName?: string | null;
};

type DashboardPayload = {
  healthScore: number;
  counts: {
    properties: number;
    projects: number;
    users: number;
    bookingsTotal: number;
    bookingsPending: number;
    bookingsConfirmed: number;
    subscriptionsTotal: number;
    subscriptionsActive: number;
    subscriptionsExpiringSoon: number;
    contactUnread: number;
    maintenanceOpen: number;
  };
  insights: DashboardInsight[];
  briefAr: string;
  briefEn: string;
  activity: ActivityItem[];
  priorityItems: PriorityItem[];
  readiness: { dbOk: boolean; paymentReady: boolean; legacyMigrated: boolean };
};

function formatTimeAgo(dateStr: string, locale: string): string {
  try {
    const date = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return locale === 'ar' ? 'الآن' : 'Just now';
    if (diffMins < 60) return locale === 'ar' ? `منذ ${diffMins} د` : `${diffMins}m ago`;
    if (diffHours < 24) return locale === 'ar' ? `منذ ${diffHours} س` : `${diffHours}h ago`;
    if (diffDays < 7) return locale === 'ar' ? `منذ ${diffDays} ي` : `${diffDays}d ago`;
    return date.toLocaleDateString(locale === 'ar' ? 'ar-OM' : 'en-GB', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

export default function AdminHomeDashboard({ locale, userName }: Props) {
  const ar = locale === 'ar';
  const t = useTranslations('dashboard');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<DashboardPayload | null>(null);

  const load = useCallback(async (silent?: boolean) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch('/api/admin/dashboard-insights', { credentials: 'include', cache: 'no-store' });
      if (!res.ok) throw new Error('failed');
      const json = (await res.json()) as DashboardPayload;
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const brief = ar ? data?.briefAr : data?.briefEn;
  const counts = data?.counts;

  const kpis = useMemo(
    () =>
      counts
        ? [
            {
              label: t('stats.properties'),
              value: counts.properties,
              href: '/admin/properties',
              icon: 'building' as IconName,
              tone: 'blue',
            },
            {
              label: t('stats.projects'),
              value: counts.projects,
              href: '/admin/projects',
              icon: 'projects' as IconName,
              tone: 'emerald',
            },
            {
              label: ar ? 'حجوزات معلقة' : 'Pending bookings',
              value: counts.bookingsPending,
              href: '/admin/bookings',
              icon: 'inbox' as IconName,
              tone: 'violet',
              alert: counts.bookingsPending > 0,
            },
            {
              label: t('stats.users'),
              value: counts.users,
              href: '/admin/users',
              icon: 'users' as IconName,
              tone: 'amber',
            },
            {
              label: ar ? 'اشتراكات نشطة' : 'Active plans',
              value: counts.subscriptionsActive,
              href: '/admin/subscriptions',
              icon: 'creditCard' as IconName,
              tone: 'teal',
            },
          ]
        : [],
    [counts, t, ar]
  );

  const quickActions = [
    {
      href: '/admin/real-estate-dashboard',
      icon: 'dashboard' as IconName,
      title: ar ? 'لوحة العقارات' : 'Real estate dashboard',
      desc: ar ? 'ملخص سريع من PostgreSQL — جدول الوحدات والتقويم في نفس الصفحة' : 'Fast PostgreSQL summary — units table & calendar on the same page',
      highlight: true,
    },
    {
      href: '/admin/properties/new',
      icon: 'plus' as IconName,
      title: t('addProperty'),
      desc: t('addPropertyDesc'),
    },
    {
      href: '/admin/bookings',
      icon: 'inbox' as IconName,
      title: ar ? 'مراجعة الحجوزات' : 'Review bookings',
      desc: ar ? 'قرارات سريعة على الطلبات الجديدة' : 'Fast decisions on new requests',
    },
    {
      href: '/admin/reports',
      icon: 'chartBar' as IconName,
      title: ar ? 'التقارير الذكية' : 'Smart reports',
      desc: ar ? 'تصدير وجدولة مخصّصة' : 'Custom export & scheduling',
    },
    {
      href: '/admin/analytics',
      icon: 'trendingUp' as IconName,
      title: ar ? 'التحليلات' : 'Analytics',
      desc: ar ? 'مؤشرات الأداء والنمو' : 'Performance & growth metrics',
    },
    {
      href: '/admin/data',
      icon: 'shieldCheck' as IconName,
      title: ar ? 'جاهزية الإنتاج' : 'Production readiness',
      desc: ar ? 'فحص DB والدفع والبيئة' : 'DB, payments & env check',
    },
    {
      href: '/admin/site',
      icon: 'pencil' as IconName,
      title: t('editSite'),
      desc: t('editSiteDesc'),
    },
  ];

  const healthScore = data?.healthScore ?? 0;

  return (
    <div className="admin-dash">
      {/* Hero */}
      <header className="admin-dash-hero mb-8">
        <div className="admin-dash-hero-glow" aria-hidden />
        <div className="admin-dash-hero-content">
          <p className="admin-dash-hero-eyebrow">{ar ? 'لوحة الإدارة الذكية' : 'Smart admin hub'}</p>
          <h1 className="admin-dash-hero-title">
            {ar ? 'مرحباً' : 'Hello'}
            {userName ? `، ${userName}` : ''}
          </h1>
          <p className="admin-dash-hero-sub">{t('subtitle')}</p>
          <div className="admin-dash-hero-meta">
            <span className="admin-dash-health">
              <Icon name="shieldCheck" className="w-4 h-4" aria-hidden />
              {ar ? 'صحة النظام' : 'System health'}: <strong>{loading ? '—' : `${healthScore}%`}</strong>
            </span>
            <button
              type="button"
              onClick={() => void load(true)}
              disabled={refreshing}
              className="admin-theme-toggle admin-theme-toggle--compact"
            >
              <Icon name="sparkles" className={`admin-theme-toggle-icon ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
              {ar ? 'تحديث الذكاء' : 'Refresh AI'}
            </button>
          </div>
        </div>
        <div className="admin-dash-hero-stats" aria-hidden={loading}>
          {!loading && counts && (
            <>
              <div className="admin-dash-hero-stat">
                <span className="admin-dash-hero-stat-value">{counts.bookingsTotal}</span>
                <span className="admin-dash-hero-stat-label">{ar ? 'حجوزات' : 'Bookings'}</span>
              </div>
              <div className="admin-dash-hero-stat">
                <span className="admin-dash-hero-stat-value">{counts.bookingsConfirmed}</span>
                <span className="admin-dash-hero-stat-label">{ar ? 'مؤكدة' : 'Confirmed'}</span>
              </div>
            </>
          )}
        </div>
      </header>

      {/* نظام إدارة العقارات — اختصار رئيسي */}
      <section className="admin-dash-legacy-launch mb-8" aria-label={ar ? 'نظام إدارة العقارات' : 'Real estate management system'}>
        <div className="admin-dash-legacy-launch-inner">
          <div className="admin-dash-legacy-launch-text">
            <span className="admin-dash-legacy-launch-badge">{ar ? 'تشغيل يومي' : 'Daily operations'}</span>
            <h2 className="admin-dash-legacy-launch-title">{ar ? 'لوحة العقارات' : 'Real estate dashboard'}</h2>
            <p className="admin-dash-legacy-launch-desc">
              {ar
                ? 'ملخص فوري للمؤشرات، جدول الوحدات، التقويم، والعقود — افتح لوحة التشغيل من هنا'
                : 'Instant KPIs, units table, calendar, and contracts — open the operations hub here'}
            </p>
          </div>
          <div className="admin-dash-legacy-launch-actions">
            <Link href={`/${locale}/admin/real-estate-dashboard`} prefetch className="admin-dash-legacy-launch-btn">
              <Icon name="dashboard" className="w-5 h-5" aria-hidden />
              {ar ? 'فتح اللوحة' : 'Open dashboard'}
            </Link>
            <Link
              href={`/${locale}/admin/real-estate-system`}
              prefetch
              className="admin-dash-legacy-launch-btn admin-dash-legacy-launch-btn--ghost"
            >
              <Icon name="home" className="w-5 h-5" aria-hidden />
              {ar ? 'النظام الكامل' : 'Full system'}
            </Link>
            <a
              href="/api/admin/legacy-real-estate/bhd-real-estate.html?mode=dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="admin-dash-legacy-launch-btn admin-dash-legacy-launch-btn--ghost"
            >
              <Icon name="externalLink" className="w-5 h-5" aria-hidden />
              {ar ? 'نافذة جديدة' : 'New window'}
            </a>
          </div>
        </div>
      </section>

      {/* KPI Grid */}
      <div className="admin-dash-kpi-grid mb-8">
        {(loading ? Array.from({ length: 5 }) : kpis).map((item, i) => {
          if (loading) {
            return <div key={i} className="admin-dash-skeleton admin-dash-skeleton--kpi rounded-2xl" />;
          }
          const kpi = item as (typeof kpis)[number];
          return (
            <Link
              key={kpi.href}
              href={`/${locale}${kpi.href}`}
              prefetch
              className={`admin-dash-kpi admin-dash-kpi--${kpi.tone}${kpi.alert ? ' admin-dash-kpi--alert' : ''}`}
            >
              <div className="admin-dash-kpi-icon">
                <Icon name={kpi.icon} className="w-6 h-6" aria-hidden />
              </div>
              <div>
                <div className="admin-dash-kpi-value">{kpi.value}</div>
                <div className="admin-dash-kpi-label">{kpi.label}</div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* AI + Priority */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 mb-8">
        <div className="xl:col-span-3">
          <AiInsightPanel
            locale={locale}
            brief={brief || (ar ? 'جاري التحليل…' : 'Analyzing…')}
            insights={data?.insights ?? []}
            loading={loading}
            onRefresh={() => void load(true)}
            refreshing={refreshing}
          />
        </div>
        <div className="xl:col-span-2 admin-card">
          <div className="admin-card-header flex items-center justify-between gap-2">
            <h2 className="admin-card-title">{ar ? 'أولويات اليوم' : "Today's priorities"}</h2>
            <span className="admin-badge admin-badge-warning text-[10px]">
              {(data?.priorityItems.length ?? 0) || (ar ? 'فارغ' : 'Clear')}
            </span>
          </div>
          <div className="admin-card-body">
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="admin-dash-skeleton admin-dash-skeleton--card h-14 rounded-xl" />
                ))}
              </div>
            ) : (data?.priorityItems.length ?? 0) > 0 ? (
              <ul className="admin-dash-priority-list">
                {data!.priorityItems.map((item) => (
                  <li key={item.id}>
                    <Link href={`/${locale}${item.href}`} prefetch className="admin-dash-priority-item">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm truncate">{ar ? item.titleAr : item.titleEn}</p>
                        <p className="text-xs opacity-80 truncate">{ar ? item.subtitleAr : item.subtitleEn}</p>
                      </div>
                      <span className="admin-dash-priority-badge">{ar ? item.badgeAr : item.badgeEn}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm opacity-70 py-6 text-center">{t('noTasks')}</p>
            )}
          </div>
        </div>
      </div>

      {/* Activity + Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="admin-card">
          <div className="admin-card-header flex items-center justify-between">
            <h2 className="admin-card-title">{t('recentActivity')}</h2>
            <Link href={`/${locale}/admin/bookings`} prefetch className="text-sm admin-accent-text font-semibold hover:underline">
              {t('viewAll')}
            </Link>
          </div>
          <div className="admin-card-body">
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="admin-dash-skeleton admin-dash-skeleton--line" />
                ))}
              </div>
            ) : (data?.activity.length ?? 0) > 0 ? (
              <ul className="admin-dash-activity-list">
                {data!.activity.map((a) => (
                  <li key={a.id}>
                    <Link href={`/${locale}${a.href}`} prefetch className={`admin-dash-activity-item admin-dash-activity-item--${a.tone}`}>
                      <span className="admin-dash-activity-dot" aria-hidden />
                      <span className="min-w-0 flex-1 text-sm truncate">{ar ? a.titleAr : a.titleEn}</span>
                      <span className="text-xs opacity-60 shrink-0">{formatTimeAgo(a.time, locale)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm opacity-70 py-4">{t('noNotifications')}</p>
            )}
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">{t('quickActions')}</h2>
          </div>
          <div className="admin-card-body">
            <div className="admin-dash-quick-grid">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={`/${locale}${action.href}`}
                  prefetch
                  className={`admin-dash-quick-action${'highlight' in action && action.highlight ? ' admin-dash-quick-action--highlight' : ''}`}
                >
                  <span className="admin-dash-quick-icon">
                    <Icon name={action.icon} className="w-5 h-5" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-sm">{action.title}</span>
                    <span className="block text-xs opacity-70 mt-0.5 line-clamp-2">{action.desc}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Readiness strip */}
      {data?.readiness && (
        <div className="admin-dash-readiness mb-8">
          {[
            { ok: data.readiness.dbOk, ar: 'قاعدة البيانات', en: 'Database' },
            { ok: data.readiness.paymentReady, ar: 'بوابة الدفع', en: 'Payments' },
            { ok: data.readiness.legacyMigrated, ar: 'ترحيل الإعدادات', en: 'Settings migration' },
          ].map((chip) => (
            <span key={chip.en} className={`admin-dash-readiness-chip${chip.ok ? ' admin-dash-readiness-chip--ok' : ''}`}>
              <Icon name={chip.ok ? 'checkCircle' : 'information'} className="w-4 h-4" aria-hidden />
              {ar ? chip.ar : chip.en}
            </span>
          ))}
          <Link href={`/${locale}/admin/data`} prefetch className="admin-dash-readiness-link">
            {ar ? 'تفاصيل الجاهزية ←' : 'Readiness details →'}
          </Link>
        </div>
      )}

      {/* Site sections */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">{t('siteSections')}</h2>
        </div>
        <div className="admin-card-body">
          <div className="admin-dash-site-grid">
            {[
              { nameKey: 'homePage' as const, href: '/admin/site?page=home' },
              { nameKey: 'propertiesPage' as const, href: '/admin/site?page=properties' },
              { nameKey: 'servicesPage' as const, href: '/admin/services' },
              { nameKey: 'contactPage' as const, href: '/admin/contact' },
              { nameKey: 'subscriptionsPage' as const, href: '/admin/subscriptions' },
              { nameKey: 'aboutPage' as const, href: '/admin/site?page=about' },
            ].map((item) => (
              <Link key={item.href} href={`/${locale}${item.href}`} prefetch className="admin-dash-site-link">
                {t(item.nameKey)}
                <Icon name={locale === 'ar' ? 'chevronLeft' : 'chevronRight'} className="w-4 h-4 opacity-50" aria-hidden />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
