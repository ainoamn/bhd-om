'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import Icon from '@/components/icons/Icon';
import ClientDashboard from '@/components/admin/ClientDashboard';
import OwnerDashboard from '@/components/admin/OwnerDashboard';
import { properties } from '@/lib/data/properties';
import { projects } from '@/lib/data/projects';
import { users } from '@/lib/data/users';
import { getBookingDisplayName, mergeBookingsFromServer, type PropertyBooking } from '@/lib/data/bookings';
import { hasDocumentsNeedingConfirmation } from '@/lib/data/bookingDocuments';

const STORAGE_KEYS = ['bhd_property_bookings', 'bhd_rental_contracts'];

/** تنسيق الوقت النسبي (منذ X) */
function formatTimeAgo(dateStr: string, locale: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return locale === 'ar' ? 'الآن' : 'Just now';
    if (diffMins < 60) return locale === 'ar' ? `منذ ${diffMins} دقيقة` : `${diffMins} min ago`;
    if (diffHours < 24) return locale === 'ar' ? `منذ ${diffHours} ساعة` : `${diffHours} hr ago`;
    if (diffDays < 7) return locale === 'ar' ? `منذ ${diffDays} يوم` : `${diffDays} day(s) ago`;
    return date.toLocaleDateString(locale === 'ar' ? 'ar-OM' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

/** دور فعّال — عند "فتح حساب" نعتمد دائماً دور المستخدم من localStorage لئلا تظهر لوحة الأدمن أو خصائصها */
function useEffectiveRole(serverRole: string | undefined) {
  const localRole = useMemo(() => {
    if (typeof window === 'undefined') return null;
    try {
      const us = localStorage.getItem('userSession');
      if (!us) return null;
      const p = JSON.parse(us) as { loginAsUser?: boolean; role?: string };
      if (p.loginAsUser && p.role) return p.role;
      return null;
    } catch {
      return null;
    }
  }, []);
  return localRole || serverRole;
}

export default function AdminDashboardPage() {
  const params = useParams();
  const { data: session, status } = useSession();
  const locale = (params?.locale as string) || 'ar';
  const t = useTranslations('dashboard');
  const serverRole = (session?.user as { role?: string })?.role;
  const userRole = useEffectiveRole(serverRole);

  const [bookings, setBookings] = useState<PropertyBooking[]>([]);
  type SubItem = { id: string; status: string; startAt: string; endAt: string; user: { name: string; email: string; serialNumber: string }; plan: { nameAr: string; nameEn: string } };
  const [subscriptionList, setSubscriptionList] = useState<SubItem[]>([]);
  const [subscriptionsExpanded, setSubscriptionsExpanded] = useState(false);
  const [subscriptionsFilter, setSubscriptionsFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [subscriptionsSearch, setSubscriptionsSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/bookings', { cache: 'no-store', credentials: 'include' });
        if (res.ok) {
          const serverBookings = await res.json();
          if (Array.isArray(serverBookings)) setBookings(serverBookings);
          if (Array.isArray(serverBookings) && serverBookings.length > 0) mergeBookingsFromServer(serverBookings);
        }
      } catch {
        // تجاهل
      }
    })();
  }, []);

  useEffect(() => {
    if (userRole !== 'ADMIN') return;
    fetch('/api/subscriptions', { cache: 'no-store', credentials: 'include' })
      .then((r) => r.ok ? r.json() : { list: [] })
      .then((d) => setSubscriptionList(Array.isArray(d?.list) ? d.list : []))
      .catch(() => setSubscriptionList([]));
  }, [userRole]);

  const pendingBookings = bookings.filter((b) => b.status === 'PENDING');
  const docsNeedingApprovalBookings = bookings.filter((b) => b.status === 'CONFIRMED' && hasDocumentsNeedingConfirmation(b.id));
  const recentBookings = [...bookings]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);
  const activeContracts = bookings.filter((b) => {
    const hasContract = !!String((b as PropertyBooking & { contractId?: unknown }).contractId || '').trim() || !!((b as PropertyBooking & { contractData?: unknown }).contractData);
    const stage = String((b as PropertyBooking & { contractStage?: unknown }).contractStage || '');
    return hasContract && stage !== 'CANCELLED';
  });

  // عرض فوري — استخدام الدور الفعّال (من الجلسة أو من localStorage عند "فتح حساب") لئلا يعود عرض الأدمن
  if (userRole === 'OWNER') return <OwnerDashboard />;
  if (userRole === 'CLIENT') return <ClientDashboard />;

  const now = new Date();
  const activeSubs = subscriptionList.filter((s) => s.status === 'active' && new Date(s.endAt) > now);
  const expiredSubs = subscriptionList.filter((s) => s.status !== 'active' || new Date(s.endAt) <= now);

  const subscriptionsFiltered =
    subscriptionsFilter === 'active'
      ? subscriptionList.filter((s) => s.status === 'active' && new Date(s.endAt) > now)
      : subscriptionsFilter === 'expired'
        ? subscriptionList.filter((s) => s.status !== 'active' || new Date(s.endAt) <= now)
        : subscriptionList;

  const q = subscriptionsSearch.trim().toLowerCase();
  const subscriptionsSearched = q
    ? subscriptionsFiltered.filter(
        (s) =>
          (s.user?.name ?? '').toLowerCase().includes(q) ||
          (s.user?.email ?? '').toLowerCase().includes(q) ||
          (s.user?.serialNumber ?? '').toLowerCase().includes(q) ||
          (s.plan?.nameAr ?? '').toLowerCase().includes(q) ||
          (s.plan?.nameEn ?? '').toLowerCase().includes(q),
      )
    : subscriptionsFiltered;

  const subscriptionsDisplayed = subscriptionsExpanded ? subscriptionsSearched : subscriptionsSearched.slice(0, 5);
  const hasMoreSubscriptions = subscriptionsSearched.length > 5;

  const stats = [
    { label: t('stats.properties'), value: properties.length, href: '/admin/properties', icon: 'building' as const, color: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-50' },
    { label: t('stats.projects'), value: projects.length, href: '/admin/projects', icon: 'projects' as const, color: 'from-emerald-500 to-emerald-600', bgColor: 'bg-emerald-50' },
    { label: locale === 'ar' ? 'طلبات معلقة' : 'Pending requests', value: pendingBookings.length, href: '/admin/bookings', icon: 'inbox' as const, color: 'from-violet-500 to-violet-600', bgColor: 'bg-violet-50' },
    { label: t('stats.users'), value: users.length, href: '/admin/users', icon: 'users' as const, color: 'from-amber-500 to-amber-600', bgColor: 'bg-amber-50' },
    { label: locale === 'ar' ? 'الاشتراكات' : 'Subscriptions', value: subscriptionList.length, href: '/admin/subscriptions', icon: 'creditCard' as const, color: 'from-teal-500 to-teal-600', bgColor: 'bg-teal-50' },
  ];

  const analyticsData = [
    { label: locale === 'ar' ? 'إجمالي الحجوزات' : 'Total bookings', value: String(bookings.length), sub: locale === 'ar' ? 'حجز ومعاينة' : 'bookings & viewings', positive: true },
    { label: locale === 'ar' ? 'حجوزات معلقة' : 'Pending', value: String(pendingBookings.length), sub: locale === 'ar' ? 'قيد المراجعة' : 'to review', positive: true },
    { label: locale === 'ar' ? 'عقود نشطة' : 'Active contracts', value: String(activeContracts.length), sub: locale === 'ar' ? 'عقود إيجار' : 'rental contracts', positive: true },
    { label: locale === 'ar' ? 'مؤكد / ملغى' : 'Confirmed / Cancelled', value: `${bookings.filter((b) => b.status === 'CONFIRMED' || b.status === 'RENTED').length} / ${bookings.filter((b) => b.status === 'CANCELLED').length}`, sub: locale === 'ar' ? 'حالة الحجوزات' : 'booking status', positive: true },
  ];

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">{t('title')}</h1>
        <p className="admin-page-subtitle">{t('subtitle')}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-6 mb-8">
        {stats.map((stat) => (
          <Link
            key={stat.href}
            href={`/${locale}${stat.href}`}
            className="admin-card group hover:shadow-lg hover:border-gray-200/100 transition-all duration-300"
          >
            <div className="admin-card-body flex items-center gap-5">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform`}>
                <Icon name={stat.icon} className="w-7 h-7" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 mb-0.5">{stat.value}</div>
                <div className="text-sm font-medium text-gray-500">{stat.label}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Analytics & Technical Tools Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="admin-card lg:col-span-2">
          <div className="admin-card-header flex items-center justify-between">
            <h2 className="admin-card-title">{t('analytics')}</h2>
            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{locale === 'ar' ? 'تحليلات متقدمة' : 'Advanced Analytics'}</span>
          </div>
          <div className="admin-card-body">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {analyticsData.map((item, index) => (
                <div key={index} className="p-4 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100/50 border border-gray-100">
                  <div className="text-2xl font-bold text-gray-900 mb-1">{item.value}</div>
                  <div className="text-sm text-gray-600 mb-0.5">{item.label}</div>
                  {'sub' in item && item.sub && <div className="text-xs text-gray-500">{item.sub}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-card-header flex items-center justify-between">
            <h2 className="admin-card-title">{t('notifications')}</h2>
            <Link href={`/${locale}/admin/bookings`} className="text-sm font-medium text-primary hover:underline">{t('viewAll')}</Link>
          </div>
          <div className="admin-card-body">
            {recentBookings.length > 0 ? (
              <ul className="space-y-3">
                {recentBookings.map((b) => (
                  <li key={b.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 text-sm">
                        {locale === 'ar'
                          ? (b.type === 'BOOKING' ? 'حجز جديد من ' : 'معاينة جديدة من ') + getBookingDisplayName(b, locale)
                          : (b.type === 'BOOKING' ? 'New booking from ' : 'New viewing from ') + getBookingDisplayName(b, 'en')}
                        {' — '}
                        <span className="text-gray-600 font-normal">{b.propertyTitleAr || b.propertyTitleEn}</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{formatTimeAgo(b.createdAt, locale)}</p>
                    </div>
                    <Link href={`/${locale}/admin/bookings?highlight=${b.id}`} className="text-xs font-medium text-[#8B6F47] hover:underline shrink-0">
                      {locale === 'ar' ? 'عرض' : 'View'}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 py-4">{t('noNotifications')}</p>
            )}
          </div>
        </div>
      </div>

      {/* Tasks & Requests Row - مراجعة حجز + مطلوب اعتماد المستندات */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="admin-card">
          <div className="admin-card-header flex items-center justify-between">
            <h2 className="admin-card-title">{t('tasks')}</h2>
            <span className="text-xs font-medium text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
              {pendingBookings.length > 0 || docsNeedingApprovalBookings.length > 0
                ? (pendingBookings.length ? `${pendingBookings.length} ${locale === 'ar' ? 'معلقة' : 'pending'}` : '') +
                  (pendingBookings.length > 0 && docsNeedingApprovalBookings.length > 0 ? ' · ' : '') +
                  (docsNeedingApprovalBookings.length ? `📋 ${docsNeedingApprovalBookings.length} ${locale === 'ar' ? 'مطلوب اعتماد المستندات' : 'docs need approval'}` : '')
                : locale === 'ar' ? 'لا مهام' : 'No tasks'}
            </span>
          </div>
          <div className="admin-card-body space-y-4">
            {pendingBookings.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2">{locale === 'ar' ? 'مراجعة حجز' : 'Review booking'}</p>
                <ul className="space-y-3">
                  {pendingBookings.slice(0, 5).map((b) => (
                    <li key={b.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {getBookingDisplayName(b, locale)} — {b.propertyTitleAr || b.propertyTitleEn}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">{formatTimeAgo(b.createdAt, locale)}</p>
                      </div>
                      <Link href={`/${locale}/admin/bookings?highlight=${b.id}`} className="text-xs font-medium text-[#8B6F47] hover:underline shrink-0">
                        {locale === 'ar' ? 'فتح' : 'Open'}
                      </Link>
                    </li>
                  ))}
                </ul>
                {pendingBookings.length > 5 && (
                  <Link href={`/${locale}/admin/bookings`} className="block mt-2 text-sm font-medium text-[#8B6F47] hover:underline">
                    {locale === 'ar' ? `عرض كل ${pendingBookings.length}` : `View all ${pendingBookings.length}`}
                  </Link>
                )}
              </div>
            )}
            {docsNeedingApprovalBookings.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-amber-700 mb-2">📋 {locale === 'ar' ? 'مطلوب اعتماد المستندات' : 'Documents need approval'}</p>
                <ul className="space-y-3">
                  {docsNeedingApprovalBookings.slice(0, 5).map((b) => (
                    <li key={b.id} className="flex items-center gap-3 p-3 rounded-xl bg-amber-50/80 hover:bg-amber-50 transition-colors border border-amber-100">
                      <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {getBookingDisplayName(b, locale)} — {b.propertyTitleAr || b.propertyTitleEn}
                        </p>
                        <p className="text-xs text-amber-600 mt-0.5">{locale === 'ar' ? 'مستندات بانتظار الاعتماد' : 'Documents pending approval'}</p>
                      </div>
                      <Link href={`/${locale}/admin/bookings?highlight=${b.id}`} className="text-xs font-medium text-[#8B6F47] hover:underline shrink-0">
                        {locale === 'ar' ? 'اعتماد' : 'Approve'}
                      </Link>
                    </li>
                  ))}
                </ul>
                {docsNeedingApprovalBookings.length > 5 && (
                  <Link href={`/${locale}/admin/bookings`} className="block mt-2 text-sm font-medium text-[#8B6F47] hover:underline">
                    {locale === 'ar' ? `عرض كل ${docsNeedingApprovalBookings.length}` : `View all ${docsNeedingApprovalBookings.length}`}
                  </Link>
                )}
              </div>
            )}
            {pendingBookings.length === 0 && docsNeedingApprovalBookings.length === 0 && (
              <p className="text-sm text-gray-500 py-4">{t('noTasks')}</p>
            )}
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-card-header flex items-center justify-between">
            <h2 className="admin-card-title">{t('requests')}</h2>
            <Link href={`/${locale}/admin/bookings`} className="text-sm font-medium text-primary hover:underline">{t('viewAll')}</Link>
          </div>
          <div className="admin-card-body">
            {pendingBookings.length > 0 ? (
              <ul className="space-y-3">
                {pendingBookings.slice(0, 8).map((b) => (
                  <li key={b.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 text-sm">
                        {b.type === 'BOOKING'
                          ? (locale === 'ar' ? 'طلب حجز — ' : 'Booking request — ') + getBookingDisplayName(b, locale)
                          : (locale === 'ar' ? 'طلب معاينة — ' : 'Viewing request — ') + getBookingDisplayName(b, locale)}
                        {' — '}
                        <span className="text-gray-600 font-normal">{b.propertyTitleAr || b.propertyTitleEn}</span>
                      </p>
                      <span className="inline-block mt-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                        {locale === 'ar' ? 'قيد المراجعة' : 'Pending'}
                      </span>
                    </div>
                    <Link href={`/${locale}/admin/bookings?highlight=${b.id}`} className="text-xs font-medium text-[#8B6F47] hover:underline shrink-0">
                      {locale === 'ar' ? 'عرض' : 'View'}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 py-4">{t('noRequests')}</p>
            )}
            {pendingBookings.length > 8 && (
              <Link href={`/${locale}/admin/bookings`} className="block mt-3 text-sm font-medium text-[#8B6F47] hover:underline">
                {locale === 'ar' ? `عرض كل الطلبات (${pendingBookings.length})` : `View all requests (${pendingBookings.length})`}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* الاشتراكات والباقات — آخر 5 مع توسيع + فلترة وبحث */}
      <div className="admin-card mb-8">
        <div className="admin-card-header flex items-center justify-between flex-wrap gap-2">
          <h2 className="admin-card-title">{locale === 'ar' ? 'الاشتراكات والباقات' : 'Subscriptions & Plans'}</h2>
          <Link href={`/${locale}/admin/subscriptions`} className="text-sm font-medium text-primary hover:underline">
            {locale === 'ar' ? 'عرض الكل وإدارة الباقات' : 'View all & manage plans'}
          </Link>
        </div>
        <div className="admin-card-body">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
              <div className="text-2xl font-bold text-emerald-700">{activeSubs.length}</div>
              <div className="text-sm text-emerald-600">{locale === 'ar' ? 'اشتراكات نشطة' : 'Active'}</div>
            </div>
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
              <div className="text-2xl font-bold text-gray-700">{expiredSubs.length}</div>
              <div className="text-sm text-gray-600">{locale === 'ar' ? 'منتهية أو ملغاة' : 'Expired / Cancelled'}</div>
            </div>
            <div className="p-4 rounded-xl bg-teal-50 border border-teal-100 col-span-2 sm:col-span-2">
              <div className="text-2xl font-bold text-teal-700">{subscriptionList.length}</div>
              <div className="text-sm text-teal-600">{locale === 'ar' ? 'إجمالي الاشتراكات' : 'Total subscriptions'}</div>
            </div>
          </div>
          {subscriptionList.length > 0 ? (
            <>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <select
                  value={subscriptionsFilter}
                  onChange={(e) => setSubscriptionsFilter(e.target.value as 'all' | 'active' | 'expired')}
                  className="admin-select text-sm py-2 px-3 rounded-lg border border-gray-200"
                >
                  <option value="all">{locale === 'ar' ? 'الكل' : 'All'}</option>
                  <option value="active">{locale === 'ar' ? 'نشطة فقط' : 'Active only'}</option>
                  <option value="expired">{locale === 'ar' ? 'منتهية فقط' : 'Expired only'}</option>
                </select>
                <input
                  type="search"
                  placeholder={locale === 'ar' ? 'بحث: اسم، بريد، رقم متسلسل، أو اسم الباقة...' : 'Search: name, email, serial, or plan...'}
                  value={subscriptionsSearch}
                  onChange={(e) => setSubscriptionsSearch(e.target.value)}
                  className="admin-input flex-1 min-w-[200px] max-w-sm text-sm py-2 px-3 rounded-lg"
                />
              </div>
              <h3 className="text-sm font-bold text-gray-700 mb-3">
                {locale === 'ar' ? 'آخر الاشتراكات' : 'Recent subscriptions'}
                {subscriptionsSearched.length !== subscriptionList.length && (
                  <span className="font-normal text-gray-500 mr-2">
                    ({locale === 'ar' ? 'معروض' : 'showing'} {subscriptionsSearched.length})
                  </span>
                )}
              </h3>
              <div className="overflow-x-auto">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{locale === 'ar' ? 'المستخدم' : 'User'}</th>
                      <th>{locale === 'ar' ? 'الباقة' : 'Plan'}</th>
                      <th>{locale === 'ar' ? 'بداية / نهاية' : 'Start / End'}</th>
                      <th>{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptionsDisplayed.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <div className="font-medium">{s.user?.name ?? '—'}</div>
                          <div className="text-xs text-gray-500">{s.user?.serialNumber ?? ''}</div>
                          {s.user?.email && <div className="text-xs text-gray-500">{s.user.email}</div>}
                        </td>
                        <td>{locale === 'ar' ? (s.plan?.nameAr ?? '—') : (s.plan?.nameEn ?? '—')}</td>
                        <td className="text-sm whitespace-nowrap">
                          {new Date(s.startAt).toLocaleDateString(locale === 'ar' ? 'ar-OM' : 'en-GB')}
                          <span className="text-gray-400 mx-1">→</span>
                          {new Date(s.endAt).toLocaleDateString(locale === 'ar' ? 'ar-OM' : 'en-GB')}
                        </td>
                        <td>
                          <span className={`admin-badge ${s.status === 'active' && new Date(s.endAt) > now ? 'admin-badge-success' : 'admin-badge-warning'}`}>
                            {s.status === 'active' && new Date(s.endAt) > now ? (locale === 'ar' ? 'نشط' : 'Active') : locale === 'ar' ? 'منتهي' : 'Expired'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {hasMoreSubscriptions && (
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setSubscriptionsExpanded((e) => !e)}
                    className="admin-btn-secondary inline-flex items-center gap-2"
                  >
                    <Icon name={subscriptionsExpanded ? 'chevronUp' : 'chevronDown'} className="w-5 h-5" />
                    {subscriptionsExpanded
                      ? (locale === 'ar' ? 'إخفاء القائمة' : 'Show less')
                      : (locale === 'ar' ? `عرض كل الاشتراكات (${subscriptionsSearched.length})` : `Show all (${subscriptionsSearched.length})`)}
                  </button>
                </div>
              )}
              {subscriptionsSearched.length === 0 && (
                <p className="text-sm text-gray-500 py-2">{locale === 'ar' ? 'لا توجد نتائج تطابق الفلتر أو البحث.' : 'No results match the filter or search.'}</p>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500 py-4">{locale === 'ar' ? 'لا توجد اشتراكات مسجلة. انتقل إلى الاشتراكات والباقات لتعيين باقات للمستخدمين.' : 'No subscriptions yet. Go to Subscriptions & Plans to assign plans to users.'}</p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="admin-card mb-8">
        <div className="admin-card-header">
          <h2 className="admin-card-title">{t('quickActions')}</h2>
          <span className="text-xs font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full">{locale === 'ar' ? 'مُحسّنة' : 'Enhanced'}</span>
        </div>
        <div className="admin-card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href={`/${locale}/admin/properties/new`}
              className="flex items-center gap-4 p-5 rounded-xl border border-gray-200/80 hover:border-[#8B6F47]/20 hover:bg-[#8B6F47]/5 transition-all duration-200 group"
            >
              <div className="w-12 h-12 rounded-xl bg-[#8B6F47]/10 flex items-center justify-center group-hover:bg-[#8B6F47]/20 transition-colors">
                <Icon name="plus" className="w-6 h-6 text-[#8B6F47]" />
              </div>
              <div>
                <span className="font-semibold text-gray-900 block">{t('addProperty')}</span>
                <span className="text-sm text-gray-500">{t('addPropertyDesc')}</span>
              </div>
            </Link>
            <Link
              href={`/${locale}/admin/projects/new`}
              className="flex items-center gap-4 p-5 rounded-xl border border-gray-200/80 hover:border-[#8B6F47]/20 hover:bg-[#8B6F47]/5 transition-all duration-200 group"
            >
              <div className="w-12 h-12 rounded-xl bg-[#8B6F47]/10 flex items-center justify-center group-hover:bg-[#8B6F47]/20 transition-colors">
                <Icon name="projects" className="w-6 h-6 text-[#8B6F47]" />
              </div>
              <div>
                <span className="font-semibold text-gray-900 block">{t('addProject')}</span>
                <span className="text-sm text-gray-500">{t('addProjectDesc')}</span>
              </div>
            </Link>
            <Link
              href={`/${locale}/admin/site`}
              className="flex items-center gap-4 p-5 rounded-xl border border-gray-200/80 hover:border-[#8B6F47]/20 hover:bg-[#8B6F47]/5 transition-all duration-200 group"
            >
              <div className="w-12 h-12 rounded-xl bg-[#8B6F47]/10 flex items-center justify-center group-hover:bg-[#8B6F47]/20 transition-colors">
                <Icon name="pencil" className="w-6 h-6 text-[#8B6F47]" />
              </div>
              <div>
                <span className="font-semibold text-gray-900 block">{t('editSite')}</span>
                <span className="text-sm text-gray-500">{t('editSiteDesc')}</span>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Site Sections + System Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">{t('siteSections')}</h2>
          </div>
          <div className="admin-card-body">
            <ul className="space-y-2">
              {[
                { nameKey: 'homePage', href: '/admin/site?page=home' },
                { nameKey: 'propertiesPage', href: '/admin/site?page=properties' },
                { nameKey: 'projectsPage', href: '/admin/site?page=projects' },
                { nameKey: 'servicesPage', href: '/admin/services' },
                { nameKey: 'contactPage', href: '/admin/contact' },
                { nameKey: 'aboutPage', href: '/admin/site?page=about' },
                { nameKey: 'subscriptionsPage', href: '/admin/subscriptions' },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={`/${locale}${item.href}`}
                    className="flex items-center justify-between py-3 px-4 rounded-xl text-gray-700 hover:bg-gray-50 hover:text-[#8B6F47] transition-colors font-medium"
                  >
                    {t(item.nameKey)}
                    <Icon name="chevronLeft" className="w-5 h-5 text-gray-400" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">{t('systemInfo')}</h2>
          </div>
          <div className="admin-card-body">
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-50/80">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <Icon name="check" className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-sm text-gray-600 font-medium">{t('statsNote')}</p>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-50/80">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Icon name="information" className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-sm text-gray-600 font-medium">{t('dashboardNote')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
