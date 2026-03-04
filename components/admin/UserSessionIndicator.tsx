/**
 * User Session Indicator Component
 * مكون مؤشر جلسة المستخدم
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import Icon from '@/components/icons/Icon';

export default function UserSessionIndicator() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';
  const { data: session } = useSession();
  
  const [storedImpersonationId, setStoredImpersonationId] = useState<string | null>(null);

  useEffect(() => {
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (session?.user && role === 'ADMIN') {
      setStoredImpersonationId(null);
      return;
    }
    const userSession = localStorage.getItem('userSession');
    if (userSession) {
      try {
        const parsed = JSON.parse(userSession) as { loginAsUser?: boolean; id?: string };
        if (parsed.loginAsUser && parsed.id) setStoredImpersonationId(parsed.id);
        else setStoredImpersonationId(null);
      } catch {
        setStoredImpersonationId(null);
      }
    } else {
      setStoredImpersonationId(null);
    }
  }, [session?.user]);

  const currentUserId = (session?.user as { id?: string } | undefined)?.id;
  const isActuallyImpersonating =
    Boolean(storedImpersonationId && session?.user && currentUserId === storedImpersonationId);

  const displayName = session?.user
    ? (session.user as { name?: string }).name?.trim() ||
      (session.user as { serialNumber?: string }).serialNumber ||
      (session.user as { email?: string }).email ||
      (session.user as { phone?: string }).phone ||
      "-"
    : "";

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

  if (!isActuallyImpersonating || !session?.user) {
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
          {displayName}
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
