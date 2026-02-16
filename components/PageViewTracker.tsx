'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { trackPageView } from '@/lib/analytics';
import { siteConfig } from '@/config/site';

/**
 * تتبع تغيير الصفحات في GA4 مع التوجيه الجانبي (SPA)
 */
export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!siteConfig.analytics.enabled || !siteConfig.tracking.pageView) return;
    trackPageView(pathname || '/', document.title);
  }, [pathname]);

  return null;
}
