'use client';

import { useLocale } from 'next-intl';
import Image from 'next/image';

interface Feature {
  icon: React.ReactNode;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
}

const features: Feature[] = [
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    titleAr: 'موثوقية وأمان',
    titleEn: 'Trust & Security',
    descAr: 'نضمن لك معاملات عقارية آمنة وشفافة مع فريق قانوني متخصص',
    descEn: 'We guarantee secure and transparent real estate transactions with a specialized legal team',
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    titleAr: 'عقارات متنوعة',
    titleEn: 'Diverse Properties',
    descAr: 'من الشقق الفاخرة إلى الفلل والأراضي الاستثمارية في أفضل المواقع',
    descEn: 'From luxury apartments to villas and investment land in the best locations',
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    titleAr: 'أسعار تنافسية',
    titleEn: 'Competitive Prices',
    descAr: 'أفضل الأسعار في السوق العقاري العماني مع خيارات دفع مرنة',
    descEn: 'Best prices in the Omani real estate market with flexible payment options',
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    titleAr: 'فريق محترف',
    titleEn: 'Professional Team',
    descAr: 'فريق من الخبراء العقاريين جاهز لمساعدتك في كل خطوة',
    descEn: 'A team of real estate experts ready to help you every step of the way',
  },
];

export default function WhyChooseUs() {
  const locale = useLocale();

  return (
    <section className="relative py-24 overflow-hidden" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      {/* خلفية القلعة */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/oman/fort-bg.jpg"
          alt="Omani Fort"
          fill
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[#1A1A2E]/85" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* العنوان */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1 bg-[#D4AF37]/20 text-[#D4AF37] text-sm font-semibold rounded-full mb-4">
            {locale === 'ar' ? 'لماذا نحن' : 'Why Choose Us'}
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            {locale === 'ar' ? 'شريكك العقاري الموثوق في عمان' : 'Your Trusted Real Estate Partner in Oman'}
          </h2>
          <p className="text-white/70 max-w-2xl mx-auto">
            {locale === 'ar'
              ? 'نقدم لك تجربة عقارية متكاملة تجمع بين الأصالة العمانية والاحترافية العالمية'
              : 'We offer you a complete real estate experience that combines Omani authenticity with global professionalism'}
          </p>
        </div>

        {/* المميزات */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative p-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-[#D4AF37]/50 transition-all duration-500 hover:-translate-y-2"
            >
              {/* أيقونة */}
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#C8102E] to-[#a00d24] flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                {feature.icon}
              </div>

              {/* عنوان */}
              <h3 className="text-xl font-bold text-white mb-3 group-hover:text-[#D4AF37] transition-colors">
                {locale === 'ar' ? feature.titleAr : feature.titleEn}
              </h3>

              {/* وصف */}
              <p className="text-white/60 leading-relaxed text-sm">
                {locale === 'ar' ? feature.descAr : feature.descEn}
              </p>

              {/* خط زخرفي */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-1 bg-gradient-to-r from-[#C8102E] via-[#D4AF37] to-[#00843D] rounded-full group-hover:w-3/4 transition-all duration-500" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
