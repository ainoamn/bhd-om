'use client';

import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { getContactForUser } from '@/lib/data/addressBook';
import { getContactLinkedContracts, getLandlordContractsFromServerBookings } from '@/lib/data/contactLinks';
import type { PropertyBooking } from '@/lib/data/bookings';

export default function MyContractsPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const { data: session } = useSession();
  const t = useTranslations('admin.nav');
  const tClient = useTranslations('admin.nav.clientNav');
  const tOwner = useTranslations('admin.nav.ownerNav');

  const user = session?.user as { id?: string; email?: string; phone?: string; role?: string } | undefined;
  const contact = user ? getContactForUser({ id: user.id || '', email: user.email, phone: user.phone }) : null;
  const [serverBookings, setServerBookings] = useState<PropertyBooking[]>([]);

  useEffect(() => {
    if (user?.role !== 'OWNER') return;
    let alive = true;
    fetch('/api/bookings', { cache: 'no-store', credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then((list: PropertyBooking[]) => {
        if (!alive) return;
        if (Array.isArray(list)) setServerBookings(list);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [user?.role]);

  const landlordCtx = useMemo(
    () => ({
      contactId: (contact as { id?: string } | null)?.id || undefined,
      userEmail: user?.email,
      userPhone: user?.phone,
    }),
    [contact, user?.email, user?.phone]
  );

  const allContracts = contact && typeof window !== 'undefined' ? getContactLinkedContracts(contact as Parameters<typeof getContactLinkedContracts>[0]) : [];
  const fromServer =
    user?.role === 'OWNER' && typeof window !== 'undefined' ? getLandlordContractsFromServerBookings(serverBookings, landlordCtx) : [];
  const localLandlord = user?.role === 'OWNER' ? allContracts.filter((c) => c.role === 'landlord') : [];
  const bookingIdsLocal = new Set(localLandlord.map((c) => c.bookingId).filter(Boolean));
  const extraFromBookings = fromServer.filter((c) => !c.bookingId || !bookingIdsLocal.has(c.bookingId));
  const contracts =
    user?.role === 'OWNER' ? [...localLandlord, ...extraFromBookings] : allContracts;

  const fmtDate = (d: string) => (d ? new Date(d).toLocaleDateString(locale === 'ar' ? 'ar-OM' : 'en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—');
  const statusLabels: Record<string, string> = {
    ACTIVE: locale === 'ar' ? 'نشط' : 'Active',
    ENDED: locale === 'ar' ? 'منتهي' : 'Ended',
    DRAFT: locale === 'ar' ? 'مسودة' : 'Draft',
  };

  const title = user?.role === 'OWNER' ? tOwner('myContracts') : tClient('myContracts');

  return (
    <div className="space-y-6">
      <AdminPageHeader title={title} subtitle={locale === 'ar' ? 'العقود المرتبطة بحسابك' : 'Contracts linked to your account'} />
      <div className="admin-card overflow-hidden">
        {contracts.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500">{locale === 'ar' ? 'لا توجد عقود' : 'No contracts'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table w-full">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">{locale === 'ar' ? 'العقار' : 'Property'}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">{locale === 'ar' ? 'من' : 'From'}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">{locale === 'ar' ? 'إلى' : 'To'}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((c) => (
                  <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{c.unitDisplay || c.propertyTitleAr}</td>
                    <td className="px-4 py-3 text-gray-600">{fmtDate(c.startDate)}</td>
                    <td className="px-4 py-3 text-gray-600">{fmtDate(c.endDate)}</td>
                    <td className="px-4 py-3">
                      <span className={`admin-badge ${c.status === 'ACTIVE' ? 'admin-badge-success' : 'admin-badge-info'}`}>
                        {statusLabels[c.status] || c.status}
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
