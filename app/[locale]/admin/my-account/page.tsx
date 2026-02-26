'use client';

import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

export default function MyAccountPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const { data: session } = useSession();
  const t = useTranslations('admin.nav');
  const tClient = useTranslations('admin.nav.clientNav');
  const tOwner = useTranslations('admin.nav.ownerNav');

  const user = session?.user as { name?: string; email?: string; phone?: string; role?: string } | undefined;
  const title = user?.role === 'OWNER' ? tOwner('myAccount') : tClient('myAccount');

  return (
    <div className="space-y-6">
      <AdminPageHeader title={title} subtitle={locale === 'ar' ? 'بيانات حسابك' : 'Your account details'} />
      <div className="admin-card max-w-md">
        <div className="admin-card-body space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">{locale === 'ar' ? 'الاسم' : 'Name'}</label>
            <p className="text-gray-900 font-medium">{user?.name || '—'}</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">{locale === 'ar' ? 'البريد الإلكتروني' : 'Email'}</label>
            <p className="text-gray-900">{user?.email || '—'}</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">{locale === 'ar' ? 'الهاتف' : 'Phone'}</label>
            <p className="text-gray-900">{user?.phone || '—'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
