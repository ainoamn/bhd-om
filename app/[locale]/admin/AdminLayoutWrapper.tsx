'use client';

import { Suspense } from 'react';
import AdminLayoutInner from './AdminLayoutInner';
import { ImpersonationProvider } from '@/lib/contexts/ImpersonationContext';
import AuthProviderWrapper from '@/components/admin/AuthProviderWrapper';

export default function AdminLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AuthProviderWrapper>
        <ImpersonationProvider>
          <AdminLayoutInner>{children}</AdminLayoutInner>
        </ImpersonationProvider>
      </AuthProviderWrapper>
    </Suspense>
  );
}
