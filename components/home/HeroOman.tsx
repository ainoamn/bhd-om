'use client';

import { useLocale } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';

export default function HeroOman() {
  const locale = useLocale();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section className="relative w-full h-screen min-h-[700px] max-h-[1080px] overflow-hidden flex items-center justify-center">
      {/* خلفية عمانية مع Parallax */}
      <div
        className="absolute inset-0 z-0"
        style={{ transform: `translateY(${scrollY * 0.4}px)` }}
      >
        <Image
          src="/images/oman/hero-bg.jpg"
          alt="Oman Mountains"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        {/* تدرج داكن للقراءة */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/70" />
      </div>

      {/* محتوى Hero */}
      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
        {/* شعار الشركة */}
        <div className="mb-6 inline-block">
          <span className="inline-block px-4 py-2 bg-[#C8102E]/90 text-white text-sm font-semibold rounded-full backdrop-blur-sm border border-white/20">
            {locale === 'ar' ? 'بن حمود للتطوير العقاري' : 'BHD Real Estate Development'}
          </span>
        </div>

        {/* العنوان الرئيسي */}
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight drop-shadow-2xl">
          {locale === 'ar' ? (
            <>
              نبني المستقبل
              <span className="block text-[#D4AF37]">بين جبال عمان</span>
            </>
          ) : (
            <>
              Building the Future
              <span className="block text-[#D4AF37]">in the Heart of Oman</span>
            </>
          )}
        </h1>

        {/* الوصف */}
        <p className="text-lg md:text-xl text-white/90 mb-10 max-w-3xl mx-auto leading-relaxed drop-shadow-lg">
          {locale === 'ar'
            ? 'اكتشف عقارات فريدة في أجمل مناطق سلطنة عمان. نقدم لك تجربة عقارية متكاملة مع خدمات احترافية وموثوقة.'
            : 'Discover unique properties in the most beautiful regions of Oman. We offer a complete real estate experience with professional and reliable services.'
          }
        </p>

        {/* أزرار CTA */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href={`/${locale}/properties`}
            className="group relative px-8 py-4 bg-[#C8102E] text-white font-bold text-lg rounded-xl hover:bg-[#a00d24] transition-all duration-300 shadow-2xl hover:shadow-red-900/50 hover:-translate-y-1 overflow-hidden"
          >
            <span className="relative z-10 flex items-center gap-2">
              {locale === 'ar' ? 'استعرض العقارات' : 'Browse Properties'}
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </span>
          </Link>

          <Link
            href={`/${locale}/projects`}
            className="group px-8 py-4 bg-white/10 backdrop-blur-md text-white font-bold text-lg rounded-xl border-2 border-white/30 hover:bg-white/20 hover:border-[#D4AF37] transition-all duration-300 hover:-translate-y-1"
          >
            <span className="flex items-center gap-2">
              {locale === 'ar' ? 'مشاريعنا' : 'Our Projects'}
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </span>
          </Link>
        </div>

        {/* مؤشر التمرير */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg className="w-8 h-8 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </div>

      {/* زخرفة سفلية */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent z-10" />
    </section>
  );
}
