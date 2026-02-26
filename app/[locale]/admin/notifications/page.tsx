'use client';

import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

export default function NotificationsPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const t = useTranslations('admin.nav');

  const label = locale === 'ar' ? 'الإشعارات' : 'Notifications';
  const clientLabel = t('clientNav.notifications');
  const ownerLabel = t('ownerNav.notifications');

  return (
    <div className="space-y-6">
      <AdminPageHeader title={clientLabel || ownerLabel || label} subtitle={locale === 'ar' ? 'الإشعارات والمستجدات الخاصة بك' : 'Your notifications and updates'} />
      <div className="admin-card p-12 text-center">
        <p className="text-gray-500">{locale === 'ar' ? 'لا توجد إشعارات جديدة' : 'No new notifications'}</p>
      </div>
    </div>
  );
}
