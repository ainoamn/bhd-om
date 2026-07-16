'use client';

import { Suspense } from 'react';
import AdminLayoutInner from './AdminLayoutInner';
import { ImpersonationProvider } from '@/lib/contexts/ImpersonationContext';
import AuthProviderWrapper from '@/components/admin/AuthProviderWrapper';

/** هيكل خفيف فوري — لا شاشة ملء كاملة تمنع ظهور القائمة */
function AdminLayoutSuspenseFallback() {
  return (
    <div className="admin-root" data-admin-theme="light" dir="rtl">
      <aside className="admin-sidebar" aria-hidden>
        <div className="admin-sidebar-brand">
          <div className="admin-sidebar-logo h-7 w-7 rounded bg-neutral-200 animate-pulse" />
          <div className="admin-sidebar-brand-text flex-1">
            <div className="h-4 w-28 rounded bg-neutral-200 animate-pulse" />
          </div>
        </div>
        <nav className="admin-nav p-3 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-9 rounded-lg bg-neutral-100 animate-pulse" />
          ))}
        </nav>
      </aside>
      <main className="admin-main">
        <div className="admin-main-inner flex items-center justify-center min-h-[40vh]">
          <div className="h-8 w-8 rounded-full border-2 admin-accent-border border-t-transparent animate-spin" aria-hidden />
        </div>
      </main>
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
