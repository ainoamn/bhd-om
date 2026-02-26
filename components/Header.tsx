'use client';

import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import LanguageSwitcher from './LanguageSwitcher';
import { getPagesVisibility, PAGES_VISIBILITY_EVENT, type PageId } from '@/lib/data/siteSettings';

interface HeaderProps {
  locale: string;
  hasUserBar?: boolean;
}

const NAV_ITEMS: { id: PageId; href: string }[] = [
  { id: 'home', href: '' },
  { id: 'properties', href: '/properties' },
  { id: 'projects', href: '/projects' },
  { id: 'services', href: '/services' },
  { id: 'contact', href: '/contact' },
  { id: 'about', href: '/about' },
];

function refreshVisibility(): Record<PageId, boolean> {
  if (typeof window === 'undefined') return getPagesVisibility();
  return getPagesVisibility();
}

export default function Header({ locale, hasUserBar }: HeaderProps) {
  const t = useTranslations('nav');
  const { data: session, status } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [visibility, setVisibility] = useState<Record<PageId, boolean>>(refreshVisibility);

  useEffect(() => {
    setVisibility(refreshVisibility());
    const handler = () => setVisibility(refreshVisibility());
    window.addEventListener(PAGES_VISIBILITY_EVENT, handler);
    return () => window.removeEventListener(PAGES_VISIBILITY_EVENT, handler);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const visibleItems = NAV_ITEMS.filter((item) => visibility[item.id]);

  return (
    <header className={`fixed left-0 right-0 z-50 transition-all duration-300 ${hasUserBar ? 'top-11' : 'top-0'} ${
      scrolled 
        ? 'bg-white shadow-md border-b border-gray-200' 
        : 'bg-white/95 backdrop-blur-sm'
    }`}>
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href={`/${locale}`} className="flex items-center gap-2 sm:gap-3 group">
            <div className="relative flex items-center justify-center group-hover:scale-105 transition-transform duration-300 w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-[6cm] lg:h-[6cm]">
              <Image
                src="/logo-bhd.png"
                alt={locale === 'ar' ? 'بن حمود للتطوير' : 'Bin Hamood Development'}
                width={226}
                height={226}
                className="object-contain logo-golden-filter w-full h-full"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent && !parent.querySelector('.logo-fallback')) {
                    const fallback = document.createElement('div');
                    fallback.className = 'logo-fallback text-primary font-bold text-2xl';
                    fallback.textContent = 'BHD';
                    parent.appendChild(fallback);
                  }
                }}
              />
            </div>
            <div className="hidden sm:block">
              <div className="text-xl font-bold leading-tight" style={{ color: '#8B6F47' }}>
                {locale === 'ar' ? 'بن حمود' : 'Bin Hamood'}
              </div>
              <div className="text-xs font-semibold" style={{ color: '#8B6F47' }}>
                {locale === 'ar' ? 'للتطوير' : 'Development'}
              </div>
              <div className="text-[10px] font-medium mt-0.5" style={{ color: '#8B6F47' }}>SPC</div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            <div className="flex items-center gap-1">
              {visibleItems.map((item) => (
                <Link
                  key={item.id}
                  href={`/${locale}${item.href}`}
                  className="px-4 py-2 text-sm font-semibold text-gray-700 hover:text-primary transition-colors duration-200 rounded-lg hover:bg-gray-50"
                >
                  {t(item.id)}
                </Link>
              ))}
            </div>
            <div className="flex items-center gap-4">
              <div className="h-8 w-px bg-gray-300"></div>
              <LanguageSwitcher currentLocale={locale} />
              {status === 'authenticated' && session?.user ? (
                <div className="flex items-center gap-3">
                  <Link
                    href={`/${locale}/admin`}
                    className="text-gray-700 hover:text-primary font-semibold text-sm transition-colors"
                    title={locale === 'ar' ? 'لوحة التحكم' : 'Dashboard'}
                  >
                    {(session.user as { name?: string }).name?.trim() ||
                      (session.user as { serialNumber?: string }).serialNumber ||
                      (session.user as { email?: string }).email ||
                      (session.user as { phone?: string }).phone ||
                      '—'}
                  </Link>
                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: `/${locale}` })}
                    className="text-gray-500 hover:text-red-600 text-xs font-medium transition-colors"
                  >
                    {locale === 'ar' ? 'تسجيل الخروج' : 'Log out'}
                  </button>
                </div>
              ) : (
                <Link 
                  href={`/${locale}/login`} 
                  className="bg-primary text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-primary-dark transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                >
                  {t('login')}
                </Link>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-2 -m-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-700 hover:text-primary hover:bg-gray-100 rounded-lg transition-all duration-200 touch-manipulation"
            aria-label="Menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        <div className={`lg:hidden overflow-hidden transition-all duration-300 ${
          isMenuOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
        }`}>
          <div className="border-t border-gray-200 bg-white py-4">
            <div className="space-y-1">
              {visibleItems.map((item) => (
                <Link
                  key={item.id}
                  href={`/${locale}${item.href}`}
                  className="block px-4 py-3.5 min-h-[44px] flex items-center text-gray-700 hover:bg-gray-50 hover:text-primary rounded-lg transition-all duration-200 font-semibold touch-manipulation"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t(item.id)}
                </Link>
              ))}
              <div className="px-4 py-3 border-t border-gray-200 mt-2">
                <LanguageSwitcher currentLocale={locale} />
              </div>
              <div className="px-4 pt-2 space-y-2">
                {status === 'authenticated' && session?.user ? (
                  <>
                    <Link
                      href={`/${locale}/admin`}
                      className="block px-4 py-3.5 min-h-[44px] flex items-center justify-between rounded-lg bg-gray-50 font-semibold text-gray-900 touch-manipulation"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <span>
                        {(session.user as { name?: string }).name?.trim() ||
                          (session.user as { serialNumber?: string }).serialNumber ||
                          (session.user as { email?: string }).email ||
                          (session.user as { phone?: string }).phone ||
                          '—'}
                      </span>
                      <span className="text-xs text-primary">{locale === 'ar' ? 'لوحة التحكم' : 'Dashboard'}</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => { setIsMenuOpen(false); signOut({ callbackUrl: `/${locale}` }); }}
                      className="block w-full py-3.5 min-h-[44px] text-red-600 hover:bg-red-50 rounded-lg font-semibold touch-manipulation"
                    >
                      {locale === 'ar' ? 'تسجيل الخروج' : 'Log out'}
                    </button>
                  </>
                ) : (
                  <Link 
                    href={`/${locale}/login`} 
                    className="block w-full bg-primary text-white px-6 py-3.5 min-h-[44px] flex items-center justify-center rounded-lg hover:bg-primary-dark transition-all duration-200 font-semibold shadow-md touch-manipulation"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {t('login')}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
