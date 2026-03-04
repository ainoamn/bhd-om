/**
 * Session Check Component
 * يمسح بيانات انتحال قديمة عند دخول المسؤول، ولا يعدّل الجلسة الحقيقية (الكوكي).
 */

'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import type { ReactNode } from 'react';

interface SessionCheckProps {
  children?: ReactNode;
  onSessionReady?: (user: unknown) => void;
}

export default function SessionCheck({ children, onSessionReady }: SessionCheckProps) {
  const [sessionChecked, setSessionChecked] = useState(false);
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'loading') return;

    const clearImpersonationStorage = () => {
      localStorage.removeItem('userSession');
      sessionStorage.removeItem('adminReturnToken');
      delete (window as unknown as Record<string, unknown>).currentUser;
      delete (window as unknown as Record<string, unknown>).isLoginAsUser;
      delete (window as unknown as Record<string, unknown>).originalAdminId;
      delete (window as unknown as Record<string, unknown>).mockNextAuthSession;
    };

    // إذا الجلسة الحالية للأدمن: مسح أي بيانات انتحال قديمة وعدم استبدال الجلسة
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (session?.user && role === 'ADMIN') {
      clearImpersonationStorage();
      if (onSessionReady) onSessionReady(session.user);
      setSessionChecked(true);
      return;
    }

    // لا نستبدل الجلسة أبداً؛ الانتحال يعتمد على كوكي حقيقي من /api/admin/impersonate-session
    setSessionChecked(true);
  }, [session, status, onSessionReady]);

  if (!sessionChecked || status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading session...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
