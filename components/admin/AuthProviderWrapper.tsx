/**
 * Auth Provider Wrapper Component
 * عند "فتح حساب" فقط نلف SessionProvider داخلياً بالجلسة الوهمية.
 * وإلا نعيد استخدام SessionProvider الجذري (Providers.tsx) — تجنّب جلب /api/auth/session مرتين.
 */

'use client';

import type { Session } from 'next-auth';
import { SessionProvider } from 'next-auth/react';
import { ReactNode, useState, useEffect, useCallback } from 'react';
import AuthSessionLocalIsolation from '@/components/AuthSessionLocalIsolation';

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
  const mock = (window as Window & { mockNextAuthSession?: Session }).mockNextAuthSession;
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

  // المسار العادي: لا SessionProvider ثانٍ — الجلسة الجذرية جاهزة أسرع للقائمة الجانبية
  if (!isImpersonating) {
    return (
      <>
        <AuthSessionLocalIsolation />
        {children}
      </>
    );
  }

  return (
    <SessionProvider
      session={mockSession}
      refetchInterval={0}
      refetchOnWindowFocus={false}
    >
      <AuthSessionLocalIsolation />
      {children}
    </SessionProvider>
  );
}
