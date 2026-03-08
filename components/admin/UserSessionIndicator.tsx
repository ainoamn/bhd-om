/**
 * User Session Indicator Component
 * مكون مؤشر جلسة المستخدم
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import Icon from '@/components/icons/Icon';

/** قراءة بيانات الانتحال من localStorage — مصدر واحد لئلا يظهر اسم/إيميل الأدمن */
function getImpersonationDisplay(): { id: string; displayName: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const us = localStorage.getItem('userSession');
    if (!us) return null;
    const p = JSON.parse(us) as { loginAsUser?: boolean; id?: string; name?: string; email?: string; serialNumber?: string };
    if (!p.loginAsUser || !p.id) return null;
    const displayName =
      (p.name || '').trim() ||
      (p.serialNumber || '').trim() ||
      (p.email || '').trim() ||
      '—';
    return { id: p.id, displayName };
  } catch {
    return null;
  }
}

export default function UserSessionIndicator() {
  const params = useParams();
  const pathname = usePathname();
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';
  const isAdminPath = pathname?.includes('/admin');

  const [impersonation, setImpersonation] = useState<{ id: string; displayName: string } | null>(() => getImpersonationDisplay());

  useEffect(() => {
    if (!isAdminPath) {
      setImpersonation(null);
      return;
    }
    setImpersonation(getImpersonationDisplay());
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'userSession' || e.key === null) setImpersonation(getImpersonationDisplay());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [isAdminPath]);

  const isActuallyImpersonating = !!impersonation?.id;
  const displayName = impersonation?.displayName ?? '';

  const handleReturnToAdmin = () => {
    const returnToken = sessionStorage.getItem('adminReturnToken');

    const clearImpersonation = () => {
      localStorage.removeItem('userSession');
      sessionStorage.removeItem('adminReturnToken');
      delete (window as any).currentUser;
      delete (window as any).isLoginAsUser;
      delete (window as any).originalAdminId;
      delete (window as any).mockNextAuthSession;
    };

    if (returnToken) {
      clearImpersonation();
      signOut({ redirect: false }).then(() => {
        window.location.href = `/api/admin/restore-session?token=${encodeURIComponent(returnToken)}&locale=${locale}`;
      });
      return;
    }

    const adminSessionBackup = localStorage.getItem('adminSessionBackup');
    if (adminSessionBackup) {
      try {
        const adminSession = JSON.parse(adminSessionBackup);
        localStorage.setItem('tempAdminSession', JSON.stringify(adminSession));
        clearImpersonation();
        signOut({ redirect: false }).then(() => {
          window.location.href = `/${locale}/login?returnToAdmin=true&adminId=${adminSession.id}`;
        });
      } catch {
        clearImpersonation();
        signOut({ callbackUrl: `/${locale}/login` });
      }
    } else {
      clearImpersonation();
      signOut({ callbackUrl: `/${locale}/login` });
    }
  };

  if (!isActuallyImpersonating || !isAdminPath) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
      <div className="flex items-center gap-2">
        <Icon name="users" className="h-4 w-4" />
        <span className="text-sm font-medium">
          {ar ? 'مسجل كمستخدم:' : 'Logged in as user:'}
        </span>
        <span className="font-bold">
          {displayName || '—'}
        </span>
      </div>
      <button
        onClick={handleReturnToAdmin}
        className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded text-sm font-medium transition-colors flex items-center gap-1"
        title={ar ? 'العودة لحساب الأدمن' : 'Return to admin account'}
      >
        <Icon name="chevronLeft" className="h-3 w-3" />
        {ar ? 'عودة للأدمن' : 'Back to Admin'}
      </button>
    </div>
  );
}
