'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import Icon from '@/components/icons/Icon';
import { getContactForUser } from '@/lib/data/addressBook';
import { getContactLinkedBookings, getContactLinkedContracts } from '@/lib/data/contactLinks';
import { searchDocuments } from '@/lib/data/accounting';

export default function ClientDashboard() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const { data: session } = useSession();
  const t = useTranslations('dashboard');
  const tNav = useTranslations('admin.nav.clientNav');

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

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">{tNav('dashboard')}</h1>
        <p className="admin-page-subtitle">
          {locale === 'ar' ? 'مرحباً، ' : 'Welcome, '}{user?.name || (locale === 'ar' ? 'العميل' : 'Client')}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
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
      </div>
    </div>
  );
}
