'use client';

import { SessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider
      refetchInterval={60 * 5}
      refetchOnWindowFocus={false}
    >
      {children}
    </SessionProvider>
  );
}
