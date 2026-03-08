/**
 * Auth Provider Wrapper Component
 * عند "فتح حساب" نمرّر الجلسة الوهمية ونعطّل إعادة الجلب لئلا يعود العرض إلى لوحة الأدمن عند التحديث أو التنقل.
 */

'use client';

import type { Session } from 'next-auth';
import { SessionProvider } from 'next-auth/react';
import { ReactNode, useState, useEffect, useCallback } from 'react';

interface AuthProviderWrapperProps {
  children: ReactNode;
}

/** يقرأ من localStorage أولاً ليعمل بعد التحديث دون الاعتماد على SessionMiddleware */
function getImpersonationSession(): Session | null | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const us = localStorage.getItem('userSession');
    if (us) {
      const p = JSON.parse(us) as { loginAsUser?: boolean; id?: string; name?: string; email?: string; role?: string; serialNumber?: string };
      if (p.loginAsUser && p.id) {
        return {
          user: { id: p.id, name: p.name ?? undefined, email: p.email ?? undefined, role: p.role || 'CLIENT', serialNumber: p.serialNumber ?? undefined },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        };
      }
    }
  } catch {}
  const mock = (window as any).mockNextAuthSession as Session | undefined;
  if (mock && typeof mock === 'object' && mock.user && mock.expires) return mock;
  return undefined;
}

export default function AuthProviderWrapper({ children }: AuthProviderWrapperProps) {
  const [mockSession, setMockSession] = useState<Session | null | undefined>(() => getImpersonationSession());
  const isImpersonating = !!mockSession;

  const refreshSession = useCallback(() => {
    setMockSession(getImpersonationSession());
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'userSession' || e.key === null) refreshSession();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [refreshSession]);

  return (
    <SessionProvider
      session={mockSession ?? undefined}
      refetchInterval={isImpersonating ? 0 : undefined}
      refetchOnWindowFocus={!isImpersonating}
    >
      {children}
    </SessionProvider>
  );
}
