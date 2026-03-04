'use client';

import AdminLayoutWrapper from './AdminLayoutWrapper';
import SessionMiddleware from '@/components/admin/SessionMiddleware';
import UserSessionIndicator from '@/components/admin/UserSessionIndicator';
import SessionCheck from '@/components/admin/SessionCheck';
import MockSessionProvider from '@/components/admin/MockSessionProvider';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionMiddleware>
      <SessionCheck>
        <MockSessionProvider user={(window as any)?.currentUser}>
          <UserSessionIndicator />
          <AdminLayoutWrapper>{children}</AdminLayoutWrapper>
        </MockSessionProvider>
      </SessionCheck>
    </SessionMiddleware>
  );
}
