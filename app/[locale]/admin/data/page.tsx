'use client';

import { useParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

export default function AdminDataPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title={ar ? 'إدارة البيانات' : 'Data Management'}
        subtitle={ar ? 'نظام إدارة البيانات - قيد التطوير' : 'Data management system - Coming soon'}
      />
      <div className="admin-card p-16 text-center">
        <div className="w-24 h-24 rounded-2xl bg-emerald-100 flex items-center justify-center text-5xl mx-auto mb-6">📊</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{ar ? 'قريباً' : 'Coming Soon'}</h2>
        <p className="text-gray-500 max-w-md mx-auto">
          {ar ? 'سنقوم بإنشاء نظام لإدارة البيانات والتقارير والإحصائيات الخاصة بالعقارات.' : 'We will create a system for managing data, reports and property statistics.'}
        </p>
      </div>
    </div>
  );
}
