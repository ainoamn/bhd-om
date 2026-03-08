/**
 * Auth Provider Wrapper Component
 * عند "فتح حساب" نمرّر الجلسة الوهمية ونعطّل إعادة الجلب لئلا يعود العرض إلى لوحة الأدمن عند التحديث أو التنقل.
 */

'use client';

import type { Session } from 'next-auth';
import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';

interface AuthProviderWrapperProps {
  children: ReactNode;
}

function getImpersonationSession(): Session | null | undefined {
  if (typeof window === 'undefined') return undefined;
  const mock = (window as any).mockNextAuthSession as Session | undefined;
  if (mock && typeof mock === 'object' && mock.user && mock.expires) return mock;
  try {
    const us = localStorage.getItem('userSession');
    if (!us) return undefined;
    const p = JSON.parse(us) as { loginAsUser?: boolean; id?: string; name?: string; email?: string; role?: string; serialNumber?: string };
    if (!p.loginAsUser || !p.id) return undefined;
    const session: Session = {
      user: { id: p.id, name: p.name ?? undefined, email: p.email ?? undefined, role: p.role || 'CLIENT', serialNumber: p.serialNumber ?? undefined },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
    return session;
  } catch {
    return undefined;
  }
}

export default function AuthProviderWrapper({ children }: AuthProviderWrapperProps) {
  const mockSession = getImpersonationSession();
  const isImpersonating = !!mockSession;

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
