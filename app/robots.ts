import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = (process.env.NEXTAUTH_URL || 'https://www.bhd-om.com').replace(/\/+$/, '');
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/ar/admin/', '/en/admin/'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}

