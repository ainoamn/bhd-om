'use client';

import { useRouter, usePathname } from 'next/navigation';
import { routing } from '@/i18n/routing';

interface LanguageSwitcherProps {
  currentLocale: string;
}

export default function LanguageSwitcher({ currentLocale }: LanguageSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = (newLocale: string) => {
    const pathWithoutLocale = pathname.replace(`/${currentLocale}`, '') || '/';
    router.push(`/${newLocale}${pathWithoutLocale}`);
  };

  // Check if we're on projects page (for styling) - exclude admin
  const isProjectsPage = pathname.includes('/projects') && !pathname.includes('/admin');

  return (
    <div className="flex items-center gap-2">
      {routing.locales.map((locale) => (
        <button
          key={locale}
          onClick={() => switchLocale(locale)}
          className={`px-4 py-2.5 rounded text-base md:text-lg font-bold transition-colors ${
            currentLocale === locale
              ? isProjectsPage
                ? 'bg-white/30 backdrop-blur-sm text-white border-2 border-white/50 shadow-lg'
                : 'bg-primary text-white shadow-lg'
              : isProjectsPage
                ? 'bg-white/10 backdrop-blur-sm text-white/90 hover:bg-white/20 border-2 border-white/30 shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          style={isProjectsPage ? { textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)' } : {}}
        >
          {locale.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
