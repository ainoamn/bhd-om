/**
 * Session Check Component
 * يمسح بيانات انتحال قديمة عند دخول المسؤول، ولا يعدّل الجلسة الحقيقية (الكوكي).
 * لا يحجب الواجهة — يعمل في الخلفية لضمان انتقال فوري بين الصفحات.
 */

'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import type { ReactNode } from 'react';

interface SessionCheckProps {
  children?: ReactNode;
  onSessionReady?: (user: unknown) => void;
}

export default function SessionCheck({ children, onSessionReady }: SessionCheckProps) {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'loading') return;

    const clearImpersonationStorage = () => {
      try {
        localStorage.removeItem('userSession');
        sessionStorage.removeItem('adminReturnToken');
        delete (window as unknown as Record<string, unknown>).currentUser;
        delete (window as unknown as Record<string, unknown>).isLoginAsUser;
        delete (window as unknown as Record<string, unknown>).originalAdminId;
        delete (window as unknown as Record<string, unknown>).mockNextAuthSession;
      } catch {}
    };

    const role = (session?.user as { role?: string } | undefined)?.role;
    if (session?.user && role === 'ADMIN') {
      clearImpersonationStorage();
      if (onSessionReady) onSessionReady(session.user);
    }
  }, [session, status, onSessionReady]);

  return <>{children}</>;
}
