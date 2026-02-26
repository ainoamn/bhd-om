'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import LanguageSwitcher from '../LanguageSwitcher';
import { getPagesVisibility, PAGES_VISIBILITY_EVENT, type PageId } from '@/lib/data/siteSettings';

const NAV_ITEMS: { id: PageId; href: string }[] = [
  { id: 'home', href: '' },
  { id: 'properties', href: '/properties' },
  { id: 'projects', href: '/projects' },
  { id: 'services', href: '/services' },
  { id: 'contact', href: '/contact' },
  { id: 'about', href: '/about' },
];

interface PageHeroProps {
  title: string;
  subtitle?: string;
  backgroundImage?: string;
  showNavigation?: boolean;
  description?: string;
  compact?: boolean; // For smaller hero sections
  showStatistics?: boolean; // Show statistics at the bottom of hero image
}

const statistics = [
  {
    id: 'managed',
    value: 245,
    labelAr: 'عقار مُدار',
    labelEn: 'Managed Properties',
    icon: '🏢',
    color: 'from-blue-500 to-blue-600',
  },
  {
    id: 'sold',
    value: 128,
    labelAr: 'عقار مبيع',
    labelEn: 'Sold Properties',
    icon: '✅',
    color: 'from-green-500 to-green-600',
  },
  {
    id: 'built',
    value: 89,
    labelAr: 'عقار مبني',
    labelEn: 'Built Properties',
    icon: '🏗️',
    color: 'from-purple-500 to-purple-600',
  },
  {
    id: 'under-construction',
    value: 42,
    labelAr: 'قيد التنفيذ',
    labelEn: 'Under Construction',
    icon: '🚧',
    color: 'from-yellow-500 to-yellow-600',
  },
  {
    id: 'visitors',
    value: 15420,
    labelAr: 'زائر للموقع',
    labelEn: 'Website Visitors',
    icon: '👥',
    color: 'from-indigo-500 to-indigo-600',
  },
  {
    id: 'clients',
    value: 356,
    labelAr: 'عميل',
    labelEn: 'Clients',
    icon: '🤝',
    color: 'from-pink-500 to-pink-600',
  },
];

export default function PageHero({ 
  title, 
  subtitle, 
  backgroundImage = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1920&q=80',
  showNavigation = true,
  description,
  compact = false,
  showStatistics = false
}: PageHeroProps) {
  const tNav = useTranslations('nav');
  const locale = useLocale();
  const { data: session, status } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [animatedValues, setAnimatedValues] = useState<Record<string, number>>({});
  const [visibility, setVisibility] = useState<Record<PageId, boolean>>(() =>
    Object.fromEntries(NAV_ITEMS.map((i) => [i.id, true])) as Record<PageId, boolean>
  );

  useEffect(() => {
    setVisibility(getPagesVisibility());
    const handler = () => setVisibility(getPagesVisibility());
    window.addEventListener(PAGES_VISIBILITY_EVENT, handler);
    return () => window.removeEventListener(PAGES_VISIBILITY_EVENT, handler);
  }, []);

  const visibleItems = NAV_ITEMS.filter((item) => visibility[item.id]);

  // Hide main header on all pages
  useEffect(() => {
    const header = document.querySelector('.projects-page-header') as HTMLElement | null;
    const main = document.querySelector('.projects-page-main') as HTMLElement | null;
    if (header) {
      header.style.display = 'none';
    }
    if (main) {
      main.style.paddingTop = '0';
    }
    return () => {
      if (header) {
        header.style.display = '';
      }
      if (main) {
        main.style.paddingTop = '';
      }
    };
  }, []);

  // Animate statistics numbers
  useEffect(() => {
    if (showStatistics) {
      statistics.forEach((stat) => {
        const duration = 2000;
        const steps = 60;
        const increment = stat.value / steps;
        let current = 0;
        let step = 0;

        const timer = setInterval(() => {
          step++;
          current = Math.min(increment * step, stat.value);
          setAnimatedValues((prev) => ({
            ...prev,
            [stat.id]: Math.floor(current),
          }));

          if (step >= steps) {
            clearInterval(timer);
            setAnimatedValues((prev) => ({
              ...prev,
              [stat.id]: stat.value,
            }));
          }
        }, duration / steps);
      });
    }
  }, [showStatistics]);

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return num.toLocaleString();
    }
    return num.toString();
  };

  return (
    <section className={`relative flex items-center justify-center overflow-hidden ${compact ? 'min-h-[30vh] md:min-h-[35vh]' : 'min-h-[70vh] md:min-h-[80vh]'}`}>
      {/* Background Image with Watermark */}
      <div className="absolute inset-0 z-0">
        <Image
          src={backgroundImage}
          alt={title}
          fill
          className="object-cover"
          priority
          quality={85}
          sizes="100vw"
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/40" style={{ zIndex: 10 }}></div>
      </div>

      {/* Navigation Inside Image */}
      {showNavigation && (
        <nav className="absolute top-0 left-0 right-0 z-50 w-full">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              {/* Logo */}
              <Link href={`/${locale}`} className="flex items-center gap-3 group">
                <div className="relative flex items-center justify-center group-hover:scale-105 transition-transform duration-300" style={{ width: '6cm', height: '6cm', minWidth: '120px', minHeight: '120px' }}>
                  <Image
                    src="/logo-bhd.png"
                    alt={locale === 'ar' ? 'بن حمود للتطوير' : 'Bin Hamood Development'}
                    width={226}
                    height={226}
                    className="object-contain logo-golden-filter"
                    style={{ width: '6cm', height: '6cm', minWidth: '120px', minHeight: '120px' }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent && !parent.querySelector('.logo-fallback')) {
                        const fallback = document.createElement('div');
                        fallback.className = 'logo-fallback text-white font-bold text-xl';
                        fallback.textContent = 'BHD';
                        parent.appendChild(fallback);
                      }
                    }}
                  />
                </div>
                <div className="hidden sm:block">
                  <div className="text-xl font-bold leading-tight drop-shadow-2xl" style={{ color: '#8B6F47', textShadow: '0 2px 8px rgba(0, 0, 0, 0.6), 0 0 20px rgba(139, 111, 71, 0.5)' }}>
                    {locale === 'ar' ? 'بن حمود' : 'Bin Hamood'}
                  </div>
                  <div className="text-xs font-semibold drop-shadow-xl" style={{ color: '#8B6F47', textShadow: '0 1px 4px rgba(0, 0, 0, 0.6), 0 0 15px rgba(139, 111, 71, 0.4)' }}>
                    {locale === 'ar' ? 'للتطوير' : 'Development'}
                  </div>
                  <div className="text-[10px] font-medium mt-0.5 drop-shadow-lg" style={{ color: '#8B6F47', textShadow: '0 1px 3px rgba(0, 0, 0, 0.6), 0 0 10px rgba(139, 111, 71, 0.3)' }}>SPC</div>
                </div>
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden lg:flex items-center gap-8">
                <div className="flex items-center gap-2">
                  {visibleItems.map((item) => (
                    <Link
                      key={item.id}
                      href={`/${locale}${item.href}`}
                      prefetch={true}
                      className="px-5 py-3 text-base md:text-lg font-bold text-white hover:text-primary transition-colors duration-200 rounded-lg hover:bg-white/20 backdrop-blur-sm shadow-lg"
                      style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)' }}
                    >
                      {tNav(item.id)}
                    </Link>
                  ))}
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-10 w-px bg-white/30"></div>
                  <LanguageSwitcher currentLocale={locale} />
                  {status === 'authenticated' && session?.user ? (
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/${locale}/admin`}
                        className="text-white hover:text-primary font-bold text-base md:text-lg transition-colors drop-shadow-lg"
                        style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)' }}
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
                        className="text-white/80 hover:text-white text-xs font-medium transition-colors"
                        style={{ textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)' }}
                      >
                        {locale === 'ar' ? 'تسجيل الخروج' : 'Log out'}
                      </button>
                    </div>
                  ) : (
                    <Link 
                      href={`/${locale}/login`} 
                      prefetch={true}
                      className="bg-primary text-white px-8 py-3.5 rounded-lg font-bold text-base md:text-lg hover:bg-primary-dark transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                      style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)' }}
                    >
                      {tNav('login')}
                    </Link>
                  )}
                </div>
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="lg:hidden p-2 text-white hover:text-primary hover:bg-white/20 rounded-lg transition-all duration-200 backdrop-blur-sm"
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
              <div className="border-t border-white/20 bg-white/10 backdrop-blur-md py-4 rounded-lg mt-2">
                <div className="space-y-1">
                  {visibleItems.map((item) => (
                    <Link
                      key={item.id}
                      href={`/${locale}${item.href}`}
                      prefetch={true}
                      className="block px-5 py-4 text-base md:text-lg text-white hover:bg-white/20 rounded-lg transition-all duration-200 font-bold"
                      onClick={() => setIsMenuOpen(false)}
                      style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)' }}
                    >
                      {tNav(item.id)}
                    </Link>
                  ))}
                  <div className="px-5 py-4 border-t border-white/20 mt-2">
                    <LanguageSwitcher currentLocale={locale} />
                  </div>
                  <div className="px-5 pt-2 space-y-2">
                    {status === 'authenticated' && session?.user ? (
                      <>
                        <Link
                          href={`/${locale}/admin`}
                          className="block px-5 py-4 min-h-[44px] flex items-center justify-between rounded-lg bg-white/10 text-white font-bold touch-manipulation"
                          onClick={() => setIsMenuOpen(false)}
                          style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)' }}
                        >
                          <span>{(session.user as { name?: string }).name || (session.user as { email?: string }).email || (session.user as { serialNumber?: string }).serialNumber || '—'}</span>
                          <span className="text-xs text-primary">{locale === 'ar' ? 'لوحة التحكم' : 'Dashboard'}</span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => { setIsMenuOpen(false); signOut({ callbackUrl: `/${locale}` }); }}
                          className="block w-full py-4 min-h-[44px] text-red-200 hover:bg-red-500/20 rounded-lg font-bold touch-manipulation"
                        >
                          {locale === 'ar' ? 'تسجيل الخروج' : 'Log out'}
                        </button>
                      </>
                    ) : (
                      <Link 
                        href={`/${locale}/login`} 
                        prefetch={true}
                        className="block w-full bg-primary text-white px-8 py-4 rounded-lg hover:bg-primary-dark transition-all duration-200 font-bold text-base md:text-lg text-center shadow-lg"
                        onClick={() => setIsMenuOpen(false)}
                        style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)' }}
                      >
                        {tNav('login')}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </nav>
      )}

      {/* Hero Content */}
      <div className="relative z-10 w-full container mx-auto px-4 text-center">
        <div className="max-w-4xl mx-auto">
          {subtitle && (
            <h4 className="text-sm md:text-base font-semibold text-white mb-4 uppercase tracking-wider drop-shadow-lg">
              {subtitle}
            </h4>
          )}
          {title && (
            <h1 className={`font-bold leading-tight ${locale === 'ar' ? 'text-4xl md:text-5xl lg:text-6xl' : 'text-base md:text-lg lg:text-xl'}`} style={{ color: '#FFFFFF', textShadow: '0 2px 8px rgba(0, 0, 0, 0.8)', marginBottom: '1cm' }}>
              {title}
            </h1>
          )}
          {description && (
            <div className="max-w-3xl mx-auto" style={{ marginTop: '1cm' }}>
              <div className="bg-white/20 backdrop-blur-md rounded-xl p-4 md:p-6 border border-white/30 shadow-2xl text-center">
                <p className="text-sm sm:text-base md:text-lg font-medium leading-relaxed" style={{ color: '#FFFFFF', textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)' }}>
                  {description}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Statistics Section - At the bottom of hero image */}
      {showStatistics && (
        <div className="absolute bottom-0 left-0 right-0 z-20 pb-1 sm:pb-2 md:pb-3 lg:pb-4 xl:pb-6">
          <div className="container mx-auto px-0.5 sm:px-1 md:px-2 lg:px-3 xl:px-4">
            <div className="bg-white/5 backdrop-blur-sm rounded-md sm:rounded-lg md:rounded-xl shadow-xl border border-white/20 p-0.5 sm:p-1 md:p-1.5 lg:p-2 xl:p-3">
              <div className="grid grid-cols-6 gap-0.5 sm:gap-1 md:gap-1.5 lg:gap-2 xl:gap-3">
                {statistics.map((stat) => (
                  <div
                    key={stat.id}
                    className="text-center hover:scale-105 transition-transform duration-200"
                  >
                    <div className={`inline-flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-8 lg:h-8 xl:w-10 xl:h-10 rounded sm:rounded-md md:rounded-lg bg-gradient-to-br ${stat.color} text-white mb-0.5 sm:mb-0.5 md:mb-1 shadow-md`}>
                      <span className="text-[8px] sm:text-[9px] md:text-xs lg:text-sm xl:text-base">{stat.icon}</span>
                    </div>
                    <div className="text-[9px] sm:text-[10px] md:text-xs lg:text-sm xl:text-base font-bold text-white mb-0 drop-shadow-lg whitespace-nowrap" style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)' }}>
                      {animatedValues[stat.id] !== undefined 
                        ? formatNumber(animatedValues[stat.id])
                        : '0'}
                      {stat.id === 'visitors' && '+'}
                    </div>
                    <div className="text-[7px] sm:text-[8px] md:text-[9px] lg:text-[10px] xl:text-xs text-white font-medium drop-shadow-md whitespace-nowrap" style={{ lineHeight: '1.1', textShadow: '0 1px 3px rgba(0, 0, 0, 0.7)' }}>
                      {locale === 'ar' ? stat.labelAr : stat.labelEn}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
