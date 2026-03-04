'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import Icon from '@/components/icons/Icon';
import { getContactForUser } from '@/lib/data/addressBook';
import { getContactLinkedBookings, getContactLinkedContracts } from '@/lib/data/contactLinks';
import { searchDocuments } from '@/lib/data/accounting';
import { getSectionsForRole, loadDashboardSettingsFromServer, DASHBOARD_SETTINGS_EVENT } from '@/lib/data/dashboardSettings';
import type { DashboardSectionKey } from '@/lib/config/dashboardRoles';

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
  const contact = user ? getContactForUser({ id: user.id || '', email: user.email, phone: user.phone }) : null;

  const bookings = contact && typeof window !== 'undefined' ? getContactLinkedBookings(contact as Parameters<typeof getContactLinkedBookings>[0]) : [];
  const contracts = contact && typeof window !== 'undefined' ? getContactLinkedContracts(contact as Parameters<typeof getContactLinkedContracts>[0]) : [];
  const docs = contact && typeof window !== 'undefined' ? searchDocuments({ contactId: (contact as { id?: string }).id }) : [];
  const receipts = docs.filter((d) => d.type === 'RECEIPT');
  const invoices = docs.filter((d) => d.type === 'INVOICE' || (d.type as string) === 'SALES_INVOICE');

  const fmtDate = (d: string) => (d ? new Date(d).toLocaleDateString(locale === 'ar' ? 'ar-OM' : 'en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—');
  const statusKey = (s: string) => (s === 'PENDING' ? (locale === 'ar' ? 'قيد الانتظار' : 'Pending') : s === 'CONFIRMED' ? (locale === 'ar' ? 'مؤكد' : 'Confirmed') : s === 'RENTED' ? (locale === 'ar' ? 'تم الإيجار' : 'Rented') : s);
  const contractStatusKey = (s: string) => (s === 'ACTIVE' ? (locale === 'ar' ? 'نشط' : 'Active') : s === 'ENDED' ? (locale === 'ar' ? 'منتهي' : 'Ended') : s);

  const hasAnyBlock = can('dashboard') || can('myBookings') || can('myContracts') || can('myInvoices') || can('myReceipts') || can('notifications');

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
                  <div className="text-xl font-bold text-gray-900">{receipts.length}</div>
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
                  <div className="text-xl font-bold text-gray-900">{invoices.length}</div>
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
                          <p className="font-medium text-gray-900 text-sm">{b.unitDisplay || b.propertyTitleAr}</p>
                          <p className="text-xs text-gray-500">{fmtDate(b.date)} · {statusKey(b.status)}</p>
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
                          <p className="font-medium text-gray-900 text-sm">{c.unitDisplay || c.propertyTitleAr}</p>
                          <p className="text-xs text-gray-500">{fmtDate(c.startDate)} – {fmtDate(c.endDate)} · {contractStatusKey(c.status)}</p>
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
