'use client';

import { useState } from 'react';
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
  const hasUserBar = status === 'authenticated' && isAdmin;
  const [barVisible, setBarVisible] = useState(false);

  return (
    <UserBarContext.Provider
      value={{ hasUserBar, barVisible, setBarVisible }}
    >
      {hasUserBar && <UserTopBar />}
      <div className={hasUserBar && barVisible ? 'pt-11' : ''}>
        <LayoutWrapper
          header={<Header locale={locale} hasUserBar={hasUserBar} />}
          footer={<Footer locale={locale} />}
        >
          {children}
        </LayoutWrapper>
      </div>
    </UserBarContext.Provider>
  );
}
