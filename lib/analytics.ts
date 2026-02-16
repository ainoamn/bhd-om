/**
 * أدوات التحليلات - يتبع معايير Google Analytics 4
 * يُستدعى فقط عند تفعيل GA4
 */

import { siteConfig } from '@/config/site';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackPageView(path: string, title?: string) {
  if (!siteConfig.analytics.enabled || typeof window?.gtag !== 'function') return;
  window.gtag!('event', 'page_view', {
    page_path: path,
    page_title: title,
  });
}

export function trackEvent(
  name: string,
  params?: Record<string, string | number | boolean>
) {
  if (!siteConfig.analytics.enabled || typeof window?.gtag !== 'function') return;
  window.gtag!('event', name, params);
}
