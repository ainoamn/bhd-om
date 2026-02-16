'use client';

import { useReportWebVitals } from 'next/web-vitals';
import { siteConfig } from '@/config/site';

/**
 * إرسال Web Vitals إلى Google Analytics
 * يقيس: LCP, FID, CLS, FCP, TTFB, INP
 */
export function WebVitals() {
  useReportWebVitals((metric) => {
    if (!siteConfig.analytics.enabled || !siteConfig.tracking.webVitals) return;

    const body = JSON.stringify({
      name: metric.name,
      value: metric.value,
      label: metric.id,
      delta: metric.delta,
      navigationType: metric.navigationType,
    });

    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', metric.name, {
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        event_label: metric.id,
        non_interaction: true,
      });
    }
  });

  return null;
}
