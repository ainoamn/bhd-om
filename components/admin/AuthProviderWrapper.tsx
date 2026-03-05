/**
 * Auth Provider Wrapper Component
 * مكون غلاف مزود المصادقة
 */

'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';

interface AuthProviderWrapperProps {
  children: ReactNode;
}

export default function AuthProviderWrapper({ children }: AuthProviderWrapperProps) {
  // Check for mock session in window (guard for SSR/prerender)
  const mockSession = typeof window !== 'undefined' ? (window as any).mockNextAuthSession : undefined;

  return (
    <SessionProvider session={mockSession}>
      {children}
    </SessionProvider>
  );
}
