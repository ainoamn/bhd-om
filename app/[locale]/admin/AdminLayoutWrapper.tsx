'use client';

import { Suspense } from 'react';
import AdminLayoutInner from './AdminLayoutInner';

export default function AdminLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    }>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </Suspense>
  );
}
