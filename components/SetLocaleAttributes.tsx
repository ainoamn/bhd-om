'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * يحدّث lang و dir في عنصر html بناءً على المسار (/ar أو /en)
 */
export default function SetLocaleAttributes() {
  const pathname = usePathname();

  useEffect(() => {
    const locale = pathname?.startsWith('/en') ? 'en' : 'ar';
    const dir = locale === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [pathname]);

  return null;
}
