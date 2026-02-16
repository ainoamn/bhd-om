'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getPagesVisibility } from '@/lib/data/siteSettings';

const PATH_TO_PAGE: Record<string, string> = {
  '': 'home',
  '/': 'home',
  '/properties': 'properties',
  '/projects': 'projects',
  '/services': 'services',
  '/about': 'about',
  '/contact': 'contact',
};

const FALLBACK_ROUTES: Record<string, string> = {
  home: '',
  properties: '/properties',
  projects: '/projects',
  services: '/services',
  about: '/about',
  contact: '/contact',
};

function getPageIdFromPath(pathname: string): string | null {
  const path = pathname?.replace(/^\/(ar|en)/, '') || '';
  const normalized = path === '' || path === '/' ? 'home' : path;
  if (PATH_TO_PAGE[normalized]) return PATH_TO_PAGE[normalized];
  const segment = normalized.split('/')[1];
  return PATH_TO_PAGE[`/${segment}`] ?? null;
}

export default function PageVisibilityGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const pageId = getPageIdFromPath(pathname || '');
    if (!pageId) return;
    const visibility = getPagesVisibility();
    const enabled = visibility[pageId as keyof typeof visibility] ?? true;
    if (!enabled) {
      const locale = pathname?.split('/')[1] || 'ar';
      const firstEnabled = (['home', 'properties', 'projects', 'services', 'about', 'contact'] as const).find(
        (id) => visibility[id]
      );
      const fallback = firstEnabled ? FALLBACK_ROUTES[firstEnabled] : '';
      router.replace(`/${locale}${fallback}`);
    }
  }, [pathname, router]);

  return <>{children}</>;
}
