import { siteConfig } from '@/config/site';

/**
 * بيانات منظمة JSON-LD حسب Schema.org
 * لتحسين SEO وعرض Rich Snippets في نتائج البحث
 */
export function OrganizationJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteConfig.company.nameEn,
    alternateName: siteConfig.company.nameAr,
    url: siteConfig.company.url,
    logo: `${siteConfig.company.url}/logo-bhd.png`,
    description: 'شركة متخصصة في التطوير العقاري والاستثمار في سلطنة عمان',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'OM',
      addressLocality: siteConfig.company.addressEn,
    },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: siteConfig.company.phone,
      contactType: 'customer service',
      areaServed: 'OM',
      availableLanguage: ['Arabic', 'English'],
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
