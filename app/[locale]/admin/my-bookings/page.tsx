'use client';

import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { getContactForUser } from '@/lib/data/addressBook';
import { getContactLinkedBookings } from '@/lib/data/contactLinks';
import Link from 'next/link';

export default function MyBookingsPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const { data: session } = useSession();
  const t = useTranslations('admin.nav.clientNav');

  const user = session?.user as { id?: string; email?: string; phone?: string } | undefined;
  const contact = user ? getContactForUser({ id: user.id || '', email: user.email, phone: user.phone }) : null;
  const bookings = contact && typeof window !== 'undefined' ? getContactLinkedBookings(contact as Parameters<typeof getContactLinkedBookings>[0]) : [];

  const fmtDate = (d: string) => (d ? new Date(d).toLocaleDateString(locale === 'ar' ? 'ar-OM' : 'en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—');
  const statusLabels: Record<string, string> = {
    PENDING: locale === 'ar' ? 'قيد الانتظار' : 'Pending',
    CONFIRMED: locale === 'ar' ? 'مؤكد' : 'Confirmed',
    RENTED: locale === 'ar' ? 'تم الإيجار' : 'Rented',
    SOLD: locale === 'ar' ? 'تم البيع' : 'Sold',
    CANCELLED: locale === 'ar' ? 'ملغي' : 'Cancelled',
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t('myBookings')} subtitle={locale === 'ar' ? 'الحجوزات المرتبطة بحسابك' : 'Bookings linked to your account'} />
      <div className="admin-card overflow-hidden">
        {bookings.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500">{locale === 'ar' ? 'لا توجد حجوزات' : 'No bookings'}</p>
            <Link href={`/${locale}/properties`} className="inline-block mt-4 text-[#8B6F47] font-medium hover:underline">
              {locale === 'ar' ? 'تصفح العقارات' : 'Browse properties'}
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table w-full">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">{locale === 'ar' ? 'العقار' : 'Property'}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">{locale === 'ar' ? 'التاريخ' : 'Date'}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{b.unitDisplay || b.propertyTitleAr}</td>
                    <td className="px-4 py-3 text-gray-600">{fmtDate(b.date)}</td>
                    <td className="px-4 py-3">
                      <span className={`admin-badge ${b.status === 'CONFIRMED' || b.status === 'RENTED' ? 'admin-badge-success' : 'admin-badge-info'}`}>
                        {statusLabels[b.status] || b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
