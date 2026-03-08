'use client';

import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import BackupManager from '@/components/admin/BackupManager';

export default function BackupPage() {
  const params = useParams();
  const { data: session, status } = useSession();
  const locale = (params?.locale as string) || 'ar';
  const userRole = (session?.user as { role?: string })?.role;
  const showAccessDenied = status === 'unauthenticated' || (status === 'authenticated' && userRole !== 'ADMIN');

  if (showAccessDenied) {
    return (
      <div className="admin-page-content p-6">
        <div className="admin-card p-12 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">{locale === 'ar' ? 'غير مصرح بالوصول' : 'Access denied'}</h2>
          <p className="text-gray-600">{locale === 'ar' ? 'هذه الصفحة متاحة فقط للمسؤولين' : 'This page is for administrators only.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page-content">
      <BackupManager />
    </div>
  );
}
