'use client';

import { usePathname } from 'next/navigation';
import AdsDisplay from '@/components/ads/AdsDisplay';
import FloatingAdsDisplay from '@/components/ads/FloatingAdsDisplay';
import PageVisibilityGuard from '@/components/PageVisibilityGuard';

export default function LayoutWrapper({
  children,
  header,
  footer,
}: {
  children: React.ReactNode;
  header: React.ReactNode;
  footer: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin = pathname?.includes('/admin');

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <PageVisibilityGuard>
      <FloatingAdsDisplay />
      <AdsDisplay position="above_header" />
      <div className="projects-page-header">{header}</div>
      <main className="min-h-screen pt-20 sm:pt-24 projects-page-main">
        {children}
        <AdsDisplay position="middle" />
        <AdsDisplay position="above_footer" />
      </main>
      <div className="projects-page-footer">{footer}</div>
    </PageVisibilityGuard>
  );
}
