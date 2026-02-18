'use client';

import AdminLayoutInner from './AdminLayoutInner';

export default function AdminLayoutWrapper({ children }: { children: React.ReactNode }) {
  return <AdminLayoutInner>{children}</AdminLayoutInner>;
}
