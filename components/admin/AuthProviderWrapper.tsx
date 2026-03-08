/**
 * Auth Provider Wrapper Component
 * عند "فتح حساب" نمرّر الجلسة الوهمية ونعطّل إعادة الجلب لئلا يعود العرض إلى لوحة الأدمن عند التحديث أو التنقل.
 */

'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';

interface AuthProviderWrapperProps {
  children: ReactNode;
}

function getImpersonationSession(): unknown {
  if (typeof window === 'undefined') return undefined;
  const mock = (window as any).mockNextAuthSession;
  if (mock) return mock;
  try {
    const us = localStorage.getItem('userSession');
    if (!us) return undefined;
    const p = JSON.parse(us) as { loginAsUser?: boolean; id?: string; name?: string; email?: string; role?: string; serialNumber?: string };
    if (!p.loginAsUser || !p.id) return undefined;
    return {
      user: { id: p.id, name: p.name, email: p.email, role: p.role || 'CLIENT', serialNumber: p.serialNumber },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
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
