'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { getPropertyById, getPropertyDataOverrides, properties as staticProperties } from '@/lib/data/properties';
import { bookingRelevantToOwnerContext } from '@/lib/data/ownerLandlordMatch';
import { useEffect, useMemo, useState } from 'react';
import type { PropertyBooking } from '@/lib/data/bookings';

export default function MyPropertiesPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const { data: session } = useSession();
  const t = useTranslations('admin.nav.ownerNav');

  const user = session?.user as { id?: string; email?: string; phone?: string } | undefined;
  const [landlordContactId, setLandlordContactId] = useState('');
  const userRole = (session?.user as { role?: string } | undefined)?.role;
  const [ownerPortfolioSerials, setOwnerPortfolioSerials] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    if (userRole !== 'OWNER') {
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
  }, [userRole]);

  const [serverBookings, setServerBookings] = useState<PropertyBooking[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    fetch('/api/user/linked-contact', { credentials: 'include', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((row) => {
        if (!alive) return;
        setLandlordContactId(row && typeof row === 'object' && typeof row.id === 'string' ? row.id : '');
      })
      .catch(() => {
        if (!alive) return;
        setLandlordContactId('');
      });
    return () => {
      alive = false;
    };
  }, [user?.id]);

  const landlordMatchCtx = useMemo(
    () => ({
      contactId: landlordContactId || undefined,
      userEmail: user?.email,
      userPhone: user?.phone,
    }),
    [landlordContactId, user?.email, user?.phone]
  );

  useEffect(() => {
    if (userRole !== 'OWNER' && !landlordContactId) return;
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
  }, [landlordContactId, userRole]);

  const propertyIds = useMemo(() => {
    const derived = new Set<number>();
    for (const b of serverBookings) {
      if (!bookingRelevantToOwnerContext(b as unknown as Record<string, unknown>, landlordMatchCtx, ownerPortfolioSerials)) continue;
      const pid = Number(b.propertyId);
      if (Number.isFinite(pid)) derived.add(pid);
    }
    const fromPortfolio = new Set<number>();
    if (ownerPortfolioSerials.size > 0) {
      for (const p of staticProperties) {
        const sn = String(p.serialNumber || '').trim();
        if (sn && ownerPortfolioSerials.has(sn)) fromPortfolio.add(p.id);
      }
    }
    return Array.from(new Set([...derived, ...fromPortfolio])).filter((n) => Number.isFinite(n));
  }, [landlordContactId, serverBookings, landlordMatchCtx, ownerPortfolioSerials]);
  const overrides = getPropertyDataOverrides();
  const properties = propertyIds.map((pid) => getPropertyById(pid, overrides)).filter(Boolean);

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t('myProperties')} subtitle={locale === 'ar' ? 'العقارات المرتبطة بحسابك كمالك' : 'Properties linked to your account as owner'} />
      <div className="admin-card overflow-hidden">
        {properties.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500">{locale === 'ar' ? 'لا توجد عقارات مرتبطة بحسابك' : 'No properties linked to your account'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {properties.map((p) => (
              <Link
                key={p?.id}
                href={`/${locale}/properties/${p?.id}`}
                className="block p-4 rounded-xl border border-gray-200 hover:border-[#8B6F47]/30 hover:bg-[#8B6F47]/5 transition-all"
              >
                <p className="font-semibold text-gray-900">{locale === 'ar' ? p?.titleAr : p?.titleEn || p?.titleAr}</p>
                <p className="text-sm text-gray-500 mt-1">{(p as { serialNumber?: string }).serialNumber}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
