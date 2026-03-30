import type { MetadataRoute } from 'next';

const LOCALES = ['ar', 'en'] as const;
const STATIC_PATHS = [
  '',
  '/about',
  '/properties',
  '/projects',
  '/services',
  '/contact',
  '/subscriptions',
  '/login',
  '/register',
  '/forgot-password',
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXTAUTH_URL || 'https://www.bhd-om.com').replace(/\/+$/, '');
  const now = new Date();
  const urls: MetadataRoute.Sitemap = [];

  for (const locale of LOCALES) {
    for (const path of STATIC_PATHS) {
      urls.push({
        url: `${base}/${locale}${path}`,
        lastModified: now,
        changeFrequency: path === '' ? 'daily' : 'weekly',
        priority: path === '' ? 1 : 0.7,
      });
    }
  }

  urls.push({
    url: base,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 1,
  });

  return urls;
}

