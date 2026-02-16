'use client';

import Link from 'next/link';

export default function Hero() {
  return (
    <section className="relative bg-gradient-to-br from-primary via-blue-700 to-primary-dark text-white py-20 md:py-32">
      <div className="absolute inset-0 bg-black/20"></div>
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-light mb-4 opacity-90">
            اكتشف منزل أحلامك معنا
          </h2>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            ابحث عن العقار المثالي لنمط حياتك
          </h1>
          <p className="text-lg md:text-xl mb-8 text-gray-100">
            نُبسِّط رحلة شراء وبيع واستئجار العقارات. يقدم فريقنا الخبير حلولاً عقارية شاملة مصممة خصيصًا لاحتياجاتك.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/properties"
              className="bg-secondary text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-yellow-600 transition-all transform hover:scale-105 shadow-lg"
            >
              ابدأ البحث
            </Link>
            <Link
              href="/contact"
              className="bg-white text-primary px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-all transform hover:scale-105 shadow-lg"
            >
              اتصل بنا
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
