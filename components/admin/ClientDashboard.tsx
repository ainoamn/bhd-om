'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import Icon from '@/components/icons/Icon';
import { getSectionsForRole, loadDashboardSettingsFromServer, DASHBOARD_SETTINGS_EVENT } from '@/lib/data/dashboardSettings';
import type { DashboardSectionKey } from '@/lib/config/dashboardRoles';
import type { PropertyBooking } from '@/lib/data/bookings';

export default function ClientDashboard() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const { data: session } = useSession();
  const t = useTranslations('dashboard');
  const tNav = useTranslations('admin.nav.clientNav');
  const [allowedSections, setAllowedSections] = useState<DashboardSectionKey[]>(() => getSectionsForRole('CLIENT'));

  useEffect(() => {
    loadDashboardSettingsFromServer().then(() => setAllowedSections(getSectionsForRole('CLIENT')));
    const handler = () => setAllowedSections(getSectionsForRole('CLIENT'));
    window.addEventListener(DASHBOARD_SETTINGS_EVENT, handler);
    return () => window.removeEventListener(DASHBOARD_SETTINGS_EVENT, handler);
  }, []);

  const can = (section: DashboardSectionKey) => allowedSections.includes(section);

  const user = session?.user as { id?: string; email?: string; name?: string; phone?: string } | undefined;
  const [bookings, setBookings] = useState<PropertyBooking[]>([]);
  const [contracts, setContracts] = useState<PropertyBooking[]>([]);
  const [receiptsCount, setReceiptsCount] = useState(0);
  const [invoicesCount, setInvoicesCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    fetch('/api/bookings', { credentials: 'include', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : []))
      .then((list: PropertyBooking[]) => {
        if (!alive) return;
        const rows = Array.isArray(list) ? list : [];
        setBookings(rows);
        setContracts(rows.filter((b) => !!((b as PropertyBooking & { contractData?: unknown }).contractData)));
      })
      .catch(() => {
        if (!alive) return;
        setBookings([]);
        setContracts([]);
      });
    return () => {
      alive = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    Promise.all([
      fetch('/api/me/accounting-documents?type=RECEIPT', { credentials: 'include', cache: 'no-store' }),
      fetch('/api/me/accounting-documents?type=INVOICE', { credentials: 'include', cache: 'no-store' }),
    ])
      .then(async ([r1, r2]) => {
        if (!alive) return;
        const [d1, d2] = await Promise.all([r1.ok ? r1.json() : [], r2.ok ? r2.json() : []]);
        setReceiptsCount(Array.isArray(d1) ? d1.length : 0);
        setInvoicesCount(Array.isArray(d2) ? d2.length : 0);
      })
      .catch(() => {
        if (!alive) return;
        setReceiptsCount(0);
        setInvoicesCount(0);
      });
    return () => {
      alive = false;
    };
  }, [user?.id]);

  const fmtDate = (d: string) => (d ? new Date(d).toLocaleDateString(locale === 'ar' ? 'ar-OM' : 'en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—');
  const statusKey = (s: string) => (s === 'PENDING' ? (locale === 'ar' ? 'قيد الانتظار' : 'Pending') : s === 'CONFIRMED' ? (locale === 'ar' ? 'مؤكد' : 'Confirmed') : s === 'RENTED' ? (locale === 'ar' ? 'تم الإيجار' : 'Rented') : s);
  const contractStatusKey = (s: string) => (s === 'APPROVED' ? (locale === 'ar' ? 'نشط' : 'Active') : s === 'DRAFT' ? (locale === 'ar' ? 'مسودة' : 'Draft') : s);

  const hasAnyBlock = can('dashboard') || can('myBookings') || can('myContracts') || can('myInvoices') || can('myReceipts') || can('notifications') || can('subscriptions');
  const [subscription, setSubscription] = useState<{ planNameAr?: string; planNameEn?: string; status?: string; endAt?: string } | null>(null);
  useEffect(() => {
    if (!allowedSections.includes('subscriptions')) return;
    fetch('/api/subscriptions/me', { credentials: 'include' })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && (d.plan || d.planNameAr || d.planNameEn) && setSubscription({ planNameAr: d.plan?.nameAr ?? d.planNameAr, planNameEn: d.plan?.nameEn ?? d.planNameEn, status: d.status, endAt: d.endAt }));
  }, [allowedSections]);

  const siteLinks = [
    { href: `/${locale}`, labelAr: 'الصفحة الرئيسية', labelEn: 'Home', icon: 'home' as const, primary: true },
    { href: `/${locale}/properties`, labelAr: 'تصفح العقارات وحجز معاينة', labelEn: 'Browse properties & book viewing', icon: 'building' as const, primary: true },
    { href: `/${locale}/projects`, labelAr: 'المشاريع', labelEn: 'Projects', icon: 'projects' as const, primary: false },
    { href: `/${locale}/services`, labelAr: 'الخدمات', labelEn: 'Services', icon: 'wrench' as const, primary: false },
    { href: `/${locale}/contact`, labelAr: 'تواصل معنا', labelEn: 'Contact us', icon: 'mail' as const, primary: false },
  ];

  return (
    <div>
      {(can('dashboard') || !hasAnyBlock) && (
        <div className="admin-page-header">
          <h1 className="admin-page-title">{tNav('dashboard')}</h1>
          <p className="admin-page-subtitle">
            {locale === 'ar' ? 'مرحباً، ' : 'Welcome, '}{user?.name || (locale === 'ar' ? 'العميل' : 'Client')}
          </p>
        </div>
      )}

      {/* الوصول للموقع: الصفحة الرئيسية، تصفح العقارات، حجز المعاينة، المشاريع، الخدمات، التواصل */}
      <div className="admin-card mb-8">
        <div className="admin-card-header">
          <h2 className="admin-card-title">
            {locale === 'ar' ? 'الوصول للموقع' : 'Access the website'}
          </h2>
          <span className="text-sm text-gray-500">
            {locale === 'ar' ? 'استخدم الصفحة الرئيسية، تصفح العقارات، احجز معاينة، وتصفح المشاريع والخدمات' : 'Use the homepage, browse properties, book viewings, and explore projects & services'}
          </span>
        </div>
        <div className="admin-card-body">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {siteLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 group ${
                  item.primary
                    ? 'border-[#8B6F47]/30 bg-[#8B6F47]/5 hover:bg-[#8B6F47]/10 hover:border-[#8B6F47]/50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${item.primary ? 'bg-[#8B6F47]/20 text-[#8B6F47]' : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'}`}>
                  <Icon name={item.icon} className="w-6 h-6" />
                </div>
                <span className={`font-medium ${item.primary ? 'text-gray-900' : 'text-gray-700'}`}>
                  {locale === 'ar' ? item.labelAr : item.labelEn}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {can('subscriptions') && (
        <div className="admin-card mb-8">
          <div className="admin-card-header flex flex-wrap items-center justify-between gap-4">
            <h2 className="admin-card-title">{locale === 'ar' ? 'اشتراكك' : 'Your subscription'}</h2>
            <Link
              href={`/${locale}/subscriptions`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-white transition-colors"
              style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)' }}
            >
              <Icon name="creditCard" className="w-5 h-5" />
              {locale === 'ar' ? 'ترقية أو تخفيض الباقة' : 'Upgrade or change plan'}
            </Link>
          </div>
          <div className="admin-card-body">
            {subscription?.planNameAr || subscription?.planNameEn ? (
              <p className="text-gray-700">
                {locale === 'ar' ? 'الباقة الحالية: ' : 'Current plan: '}
                <strong>{locale === 'ar' ? (subscription.planNameAr || subscription.planNameEn) : (subscription.planNameEn || subscription.planNameAr)}</strong>
                {subscription.endAt && (
                  <span className="text-sm text-gray-500 block mt-1">
                    {locale === 'ar' ? 'تنتهي في: ' : 'Ends: '}{new Date(subscription.endAt).toLocaleDateString(locale === 'ar' ? 'ar-OM' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                )}
              </p>
            ) : (
              <p className="text-gray-600">{locale === 'ar' ? 'لا يوجد اشتراك فعّال. يمكنك الاشتراك في باقة من صفحة الباقات.' : 'No active subscription. You can subscribe to a plan from the plans page.'}</p>
            )}
          </div>
        </div>
      )}

      {hasAnyBlock && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          {can('myBookings') && (
            <Link href={`/${locale}/admin/my-bookings`} className="admin-card group hover:shadow-lg hover:border-gray-200/100 transition-all">
              <div className="admin-card-body flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform">
                  <Icon name="calendar" className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xl font-bold text-gray-900">{bookings.length}</div>
                  <div className="text-sm text-gray-500">{tNav('myBookings')}</div>
                </div>
              </div>
            </Link>
          )}
          {can('myContracts') && (
            <Link href={`/${locale}/admin/my-contracts`} className="admin-card group hover:shadow-lg hover:border-gray-200/100 transition-all">
              <div className="admin-card-body flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition-transform">
                  <Icon name="archive" className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xl font-bold text-gray-900">{contracts.length}</div>
                  <div className="text-sm text-gray-500">{tNav('myContracts')}</div>
                </div>
              </div>
            </Link>
          )}
          {can('myReceipts') && (
            <Link href={`/${locale}/admin/my-receipts`} className="admin-card group hover:shadow-lg hover:border-gray-200/100 transition-all">
              <div className="admin-card-body flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600 group-hover:scale-105 transition-transform">
                  <Icon name="documentText" className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xl font-bold text-gray-900">{receiptsCount}</div>
                  <div className="text-sm text-gray-500">{tNav('myReceipts')}</div>
                </div>
              </div>
            </Link>
          )}
          {can('myInvoices') && (
            <Link href={`/${locale}/admin/my-invoices`} className="admin-card group hover:shadow-lg hover:border-gray-200/100 transition-all">
              <div className="admin-card-body flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 group-hover:scale-105 transition-transform">
                  <Icon name="documentText" className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xl font-bold text-gray-900">{invoicesCount}</div>
                  <div className="text-sm text-gray-500">{tNav('myInvoices')}</div>
                </div>
              </div>
            </Link>
          )}
          {can('notifications') && (
            <Link href={`/${locale}/admin/notifications`} className="admin-card group hover:shadow-lg hover:border-gray-200/100 transition-all">
              <div className="admin-card-body flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600 group-hover:scale-105 transition-transform">
                  <Icon name="inbox" className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xl font-bold text-gray-900">0</div>
                  <div className="text-sm text-gray-500">{tNav('notifications')}</div>
                </div>
              </div>
            </Link>
          )}
        </div>
      )}

      {(can('myBookings') || can('myContracts')) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {can('myBookings') && (
            <div className="admin-card">
              <div className="admin-card-header flex items-center justify-between">
                <h2 className="admin-card-title">{tNav('myBookings')}</h2>
                <Link href={`/${locale}/admin/my-bookings`} className="text-sm font-medium text-[#8B6F47] hover:underline">
                  {locale === 'ar' ? 'عرض الكل' : 'View all'}
                </Link>
              </div>
              <div className="admin-card-body">
                {bookings.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4">{locale === 'ar' ? 'لا توجد حجوزات' : 'No bookings'}</p>
                ) : (
                  <ul className="space-y-3">
                    {bookings.slice(0, 5).map((b) => (
                      <li key={b.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{b.propertyTitleAr}</p>
                          <p className="text-xs text-gray-500">{fmtDate(String(b.createdAt || ''))} · {statusKey(b.status)}</p>
                        </div>
                        <Icon name="chevronLeft" className="w-5 h-5 text-gray-400" />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
          {can('myContracts') && (
            <div className="admin-card">
              <div className="admin-card-header flex items-center justify-between">
                <h2 className="admin-card-title">{tNav('myContracts')}</h2>
                <Link href={`/${locale}/admin/my-contracts`} className="text-sm font-medium text-[#8B6F47] hover:underline">
                  {locale === 'ar' ? 'عرض الكل' : 'View all'}
                </Link>
              </div>
              <div className="admin-card-body">
                {contracts.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4">{locale === 'ar' ? 'لا توجد عقود' : 'No contracts'}</p>
                ) : (
                  <ul className="space-y-3">
                    {contracts.slice(0, 5).map((c) => (
                      <li key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{c.propertyTitleAr}</p>
                          <p className="text-xs text-gray-500">{fmtDate(String(c.createdAt || ''))} · {contractStatusKey(String(c.contractStage || 'DRAFT'))}</p>
                        </div>
                        <Icon name="chevronLeft" className="w-5 h-5 text-gray-400" />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {!hasAnyBlock && (
        <div className="admin-card p-8 text-center">
          <p className="text-gray-600">
            {locale === 'ar' ? 'لا توجد أقسام مخصّصة لك في لوحة التحكم. تواصل مع المدير إن احتجت صلاحيات إضافية.' : 'No dashboard sections are assigned to you. Contact the administrator if you need additional access.'}
          </p>
        </div>
      )}
    </div>
  );
}
