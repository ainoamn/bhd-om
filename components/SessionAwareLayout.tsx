'use client';

import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import LayoutWrapper from '@/components/LayoutWrapper';
import UserTopBar from '@/components/UserTopBar';
import { UserBarContext } from '@/components/UserBarContext';

export default function SessionAwareLayout({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: string;
}) {
  const { status } = useSession();
  const pathname = usePathname();
  const isAdmin = pathname?.includes('/admin');
  const isAuthPage = pathname?.endsWith('/login') || pathname?.endsWith('/register') || pathname?.includes('/forgot-password');
  const hasUserBar = status === 'authenticated' && (isAdmin || isAuthPage);

  return (
    <UserBarContext.Provider value={hasUserBar}>
      {hasUserBar && <UserTopBar />}
      <div className={hasUserBar ? 'pt-11' : ''}>
        <LayoutWrapper
          header={<Header locale={locale} hasUserBar={false} />}
          footer={<Footer locale={locale} />}
        >
          {children}
        </LayoutWrapper>
      </div>
    </UserBarContext.Provider>
  );
}
