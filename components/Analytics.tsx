'use client';

import Script from 'next/script';
import { siteConfig } from '@/config/site';

/**
 * مكوّن التحليلات - Google Analytics 4
 * يُحمّل فقط عند وجود معرف القياس
 */
export default function Analytics() {
  if (!siteConfig.analytics.enabled || !siteConfig.analytics.ga4Id) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${siteConfig.analytics.ga4Id}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${siteConfig.analytics.ga4Id}', {
            page_path: window.location.pathname,
            send_page_view: true
          });
        `}
      </Script>
    </>
  );
}
