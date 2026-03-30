'use client';

import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { getLandlordContractsFromServerBookings } from '@/lib/data/contactLinks';
import type { PropertyBooking } from '@/lib/data/bookings';

export default function MyContractsPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const { data: session } = useSession();
  const t = useTranslations('admin.nav');
  const tClient = useTranslations('admin.nav.clientNav');
  const tOwner = useTranslations('admin.nav.ownerNav');

  const user = session?.user as { id?: string; email?: string; phone?: string; role?: string } | undefined;
  const [linkedContactId, setLinkedContactId] = useState<string>('');
  const [serverBookings, setServerBookings] = useState<PropertyBooking[]>([]);
  const [ownerPortfolioSerials, setOwnerPortfolioSerials] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (user?.role !== 'OWNER') {
      setOwnerPortfolioSerials(new Set());
      return;
    }
    let alive = true;
    fetch('/api/admin/properties', { credentials: 'include', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { list?: Array<{ serialNumber?: string }> } | null) => {
        if (!alive) return;
        const list = Array.isArray(data?.list) ? data.list : [];
        setOwnerPortfolioSerials(
          new Set(list.map((p) => String(p.serialNumber || '').trim()).filter(Boolean))
        );
      })
      .catch(() => setOwnerPortfolioSerials(new Set()));
    return () => {
      alive = false;
    };
  }, [user?.role]);

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    fetch('/api/user/linked-contact', { credentials: 'include', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((row) => {
        if (!alive) return;
        setLinkedContactId(row && typeof row === 'object' && typeof row.id === 'string' ? row.id : '');
      })
      .catch(() => {
        if (!alive) return;
        setLinkedContactId('');
      });
    return () => {
      alive = false;
    };
  }, [user?.id]);

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
      contactId: linkedContactId || undefined,
      userEmail: user?.email,
      userPhone: user?.phone,
    }),
    [linkedContactId, user?.email, user?.phone]
  );

  const contracts = useMemo(() => {
    if (user?.role === 'OWNER') {
      return getLandlordContractsFromServerBookings(serverBookings, landlordCtx, ownerPortfolioSerials);
    }
    const out = serverBookings
      .filter((b) => !!((b as PropertyBooking & { contractData?: unknown }).contractData))
      .map((b) => {
        const cd = ((b as PropertyBooking & { contractData?: Record<string, unknown> }).contractData || {}) as Record<string, unknown>;
        const titleAr = String(b.propertyTitleAr || '');
        const titleEn = String(b.propertyTitleEn || '');
        return {
          id: `booking-contract-${b.id}`,
          contractId: String(b.contractId || b.id),
          bookingId: String(b.id),
          date: String(b.createdAt || ''),
          propertyId: Number(b.propertyId),
          propertyTitleAr: titleAr,
          propertyTitleEn: titleEn,
          unitKey: b.unitKey ? String(b.unitKey) : undefined,
          unitDisplay: titleAr,
          landlordName: String(cd.landlordName || ''),
          startDate: String(cd.startDate || b.createdAt || ''),
          endDate: String(cd.endDate || b.createdAt || ''),
          status: (b.contractStage === 'APPROVED' ? 'ACTIVE' : 'DRAFT') as 'ACTIVE' | 'DRAFT',
          hasFinancialClaims: false,
          role: 'tenant' as const,
        };
      });
    return out;
  }, [user?.role, serverBookings, landlordCtx, ownerPortfolioSerials]);

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
