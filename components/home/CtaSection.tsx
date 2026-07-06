'use client';

import { useLocale } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';

export default function CtaSection() {
  const locale = useLocale();

  return (
    <section className="relative py-24 overflow-hidden" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      {/* خلفية كورنيش مسقط */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/oman/muscat-corniche.jpg"
          alt="Muscat Corniche"
          fill
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1A1A2E]/90 via-[#1A1A2E]/70 to-[#1A1A2E]/90" />
      </div>

      {/* نمط زخرفي */}
      <div className="absolute inset-0 opacity-5 z-0" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E")`,
      }} />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* الشعار */}
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 mb-8">
            <span className="w-3 h-3 bg-[#00843D] rounded-full animate-pulse" />
            <span className="text-white/90 text-sm font-medium">
              {locale === 'ar' ? 'ابدأ رحلتك العقارية اليوم' : 'Start Your Real Estate Journey Today'}
            </span>
          </div>

          {/* العنوان */}
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            {locale === 'ar' ? (
              <>
                هل تبحث عن{' '}
                <span className="text-[#D4AF37]">عقارك المثالي</span>
                <br />
                في سلطنة عمان؟
              </>
            ) : (
              <>
                Looking for Your{' '}
                <span className="text-[#D4AF37]">Perfect Property</span>
                <br />
                in Oman?
              </>
            )}
          </h2>

          {/* الوصف */}
          <p className="text-lg text-white/80 mb-10 max-w-2xl mx-auto leading-relaxed">
            {locale === 'ar'
              ? 'فريقنا من الخبراء العقاريين جاهز لمساعدتك في العثور على العقار المثالي الذي يناسب احتياجاتك وميزانيتك. سواء كنت تبحث عن منزل العمر أو استثمار مربح، نحن هنا من أجلك.'
              : 'Our team of real estate experts is ready to help you find the perfect property that suits your needs and budget. Whether you are looking for a dream home or a profitable investment, we are here for you.'}
          </p>

          {/* أزرار */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href={`/${locale}/contact`}
              className="group px-10 py-5 bg-[#C8102E] text-white font-bold text-lg rounded-xl hover:bg-[#a00d24] transition-all duration-300 shadow-2xl hover:shadow-red-900/50 hover:-translate-y-1"
            >
              <span className="flex items-center gap-2">
                {locale === 'ar' ? 'تواصل معنا' : 'Contact Us'}
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </span>
            </Link>

            <Link
              href={`/${locale}/properties`}
              className="group px-10 py-5 bg-white/10 backdrop-blur-md text-white font-bold text-lg rounded-xl border-2 border-white/30 hover:bg-white/20 hover:border-[#D4AF37] transition-all duration-300 hover:-translate-y-1"
            >
              <span className="flex items-center gap-2">
                {locale === 'ar' ? 'تصفح العقارات' : 'Browse Properties'}
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
            </Link>
          </div>

          {/* معلومات التواصل */}
          <div className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-center items-center gap-8 text-white/70">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-[#D4AF37]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span>+968 XXXX XXXX</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-[#D4AF37]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>info@bhd-om.com</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-[#D4AF37]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{locale === 'ar' ? 'مسقط، سلطنة عمان' : 'Muscat, Sultanate of Oman'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ألوان العلم في الأسفل */}
      <div className="absolute bottom-0 left-0 right-0 flex h-1">
        <div className="flex-1 bg-[#C8102E]" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-[#00843D]" />
      </div>
    </section>
  );
}
