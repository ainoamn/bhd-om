'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { getContactForUser } from '@/lib/data/addressBook';
import { getPropertyIdsForLandlord } from '@/lib/data/propertyLandlords';
import { getPropertyById, getPropertyDataOverrides } from '@/lib/data/properties';

export default function MyPropertiesPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const { data: session } = useSession();
  const t = useTranslations('admin.nav.ownerNav');

  const user = session?.user as { id?: string; email?: string; phone?: string } | undefined;
  const contact = user ? getContactForUser({ id: user.id || '', email: user.email, phone: user.phone }) : null;

  const propertyIds = contact && (contact as { id?: string }).id && typeof window !== 'undefined'
    ? getPropertyIdsForLandlord((contact as { id: string }).id)
    : [];
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
