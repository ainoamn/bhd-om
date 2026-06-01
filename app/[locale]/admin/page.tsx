'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AdminHomeDashboard from '@/components/admin/AdminHomeDashboard';
import ClientDashboard from '@/components/admin/ClientDashboard';
import OwnerDashboard from '@/components/admin/OwnerDashboard';

function useEffectiveRole(serverRole: string | undefined) {
  const localRole = useMemo(() => {
    if (typeof window === 'undefined') return null;
    try {
      const us = localStorage.getItem('userSession');
      if (!us) return null;
      const p = JSON.parse(us) as { loginAsUser?: boolean; role?: string };
      if (p.loginAsUser && p.role) return p.role;
      return null;
    } catch {
      return null;
    }
  }, []);
  return localRole || serverRole;
}

export default function AdminDashboardPage() {
  const params = useParams();
  const { data: session, status } = useSession();
  const locale = (params?.locale as string) || 'ar';
  const serverRole = (session?.user as { role?: string })?.role;
  const userRole = useEffectiveRole(serverRole);
  const userName =
    (session?.user as { name?: string })?.name ||
    (session?.user as { serialNumber?: string })?.serialNumber ||
    null;

  if (status === 'loading' && !userRole) {
    return (
      <div className="admin-dash flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="admin-dash-skeleton w-10 h-10 rounded-full" />
          <p className="text-sm font-medium opacity-70">
            {locale === 'ar' ? 'جاري تحميل لوحتك الذكية…' : 'Loading your smart dashboard…'}
          </p>
        </div>
      </div>
    );
  }

  if (userRole === 'OWNER') return <OwnerDashboard />;
  if (userRole === 'CLIENT') return <ClientDashboard />;

  return <AdminHomeDashboard locale={locale} userName={userName} />;
}
