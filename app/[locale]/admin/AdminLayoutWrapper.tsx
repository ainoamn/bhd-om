'use client';

import { Suspense } from 'react';
import AdminLayoutInner from './AdminLayoutInner';
import { ImpersonationProvider } from '@/lib/contexts/ImpersonationContext';
import AuthProviderWrapper from '@/components/admin/AuthProviderWrapper';

function AdminLayoutSuspenseFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f5f0]">
      <div className="flex flex-col items-center gap-4 text-neutral-600">
        <div className="h-10 w-10 rounded-full border-2 border-[#8B6F47] border-t-transparent animate-spin" aria-hidden />
        <p className="text-sm font-medium">Loading · جاري التحميل</p>
      </div>
    </div>
  );
}

export default function AdminLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<AdminLayoutSuspenseFallback />}>
      <AuthProviderWrapper>
        <ImpersonationProvider>
          <AdminLayoutInner>{children}</AdminLayoutInner>
        </ImpersonationProvider>
      </AuthProviderWrapper>
    </Suspense>
  );
}
