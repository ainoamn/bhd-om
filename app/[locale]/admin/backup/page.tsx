'use client';

import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import BackupManager from '@/components/admin/BackupManager';

export default function BackupPage() {
  const params = useParams();
  const { data: session, status } = useSession();
  const locale = (params?.locale as string) || 'ar';
  const userRole = (session?.user as { role?: string })?.role;

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-[#8B6F47] border-t-transparent" />
      </div>
    );
  }

  if (userRole !== 'ADMIN') {
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
