'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const PUBLIC_PATHS = ['/', '/about', '/brand', '/login', '/contact', '/properties', '/projects', '/services', '/subscriptions'];

export default function NavigationWarmup({ locale }: { locale: string }) {
  const router = useRouter();
  useEffect(() => {
    PUBLIC_PATHS.forEach((path) => {
      const href = path === '/' ? `/${locale}` : `/${locale}${path}`;
      try {
        router.prefetch(href);
      } catch {
        /* ignore */
      }
    });
  }, [locale, router]);
  return null;
}
