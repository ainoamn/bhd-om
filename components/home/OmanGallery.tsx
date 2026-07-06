'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import Image from 'next/image';

interface GalleryItem {
  src: string;
  titleAr: string;
  titleEn: string;
  locationAr: string;
  locationEn: string;
}

const galleryItems: GalleryItem[] = [
  { src: '/images/oman/jabal-shams.jpg', titleAr: 'جبل شمس', titleEn: 'Jebel Shams', locationAr: 'الداخلية', locationEn: 'Ad Dakhiliyah' },
  { src: '/images/oman/salalah-khareef.jpg', titleAr: 'خريف صلالة', titleEn: 'Salalah Khareef', locationAr: 'ظفار', locationEn: 'Dhofar' },
  { src: '/images/oman/wadi-shab.jpg', titleAr: 'وادي شاب', titleEn: 'Wadi Shab', locationAr: 'الشرقية', locationEn: 'Ash Sharqiyah' },
  { src: '/images/oman/grand-mosque.jpg', titleAr: 'جامع السلطان قابوس', titleEn: 'Sultan Qaboos Mosque', locationAr: 'مسقط', locationEn: 'Muscat' },
  { src: '/images/oman/fort-bg.jpg', titleAr: 'قلعة نزوى', titleEn: 'Nizwa Fort', locationAr: 'الداخلية', locationEn: 'Ad Dakhiliyah' },
  { src: '/images/oman/oman-sea.jpg', titleAr: 'شواطئ عمان', titleEn: 'Oman Beaches', locationAr: 'مسقط', locationEn: 'Muscat' },
];

export default function OmanGallery() {
  const locale = useLocale();
  const [activeFilter, setActiveFilter] = useState('all');

  const filters = [
    { key: 'all', labelAr: 'الكل', labelEn: 'All' },
    { key: 'muscat', labelAr: 'مسقط', labelEn: 'Muscat' },
    { key: 'dakhiliyah', labelAr: 'الداخلية', labelEn: 'Ad Dakhiliyah' },
    { key: 'dhofar', labelAr: 'ظفار', labelEn: 'Dhofar' },
    { key: 'sharqiyah', labelAr: 'الشرقية', labelEn: 'Ash Sharqiyah' },
  ];

  const filteredItems = activeFilter === 'all'
    ? galleryItems
    : galleryItems.filter(item => {
        if (activeFilter === 'muscat') return item.locationEn === 'Muscat';
        if (activeFilter === 'dakhiliyah') return item.locationEn === 'Ad Dakhiliyah';
        if (activeFilter === 'dhofar') return item.locationEn === 'Dhofar';
        if (activeFilter === 'sharqiyah') return item.locationEn === 'Ash Sharqiyah';
        return true;
      });

  return (
    <section className="py-20 bg-white" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <div className="container mx-auto px-4">
        {/* العنوان */}
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1 bg-[#C8102E]/10 text-[#C8102E] text-sm font-semibold rounded-full mb-4">
            {locale === 'ar' ? 'اكتشف عمان' : 'Discover Oman'}
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-[#1A1A2E] mb-4">
            {locale === 'ar' ? 'جمال سلطنة عمان' : 'The Beauty of Oman'}
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            {locale === 'ar'
              ? 'من جبالها الشامخة إلى شواطئها الساحرة، اكتشف لماذا عمان هي الوجهة المثالية للاستثمار العقاري'
              : 'From its towering mountains to its enchanting beaches, discover why Oman is the ideal destination for real estate investment'}
          </p>
        </div>

        {/* فلاتر */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {filters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                activeFilter === filter.key
                  ? 'bg-[#C8102E] text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {locale === 'ar' ? filter.labelAr : filter.labelEn}
            </button>
          ))}
        </div>

        {/* شبكة الصور */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item, index) => (
            <div
              key={item.src}
              className="group relative overflow-hidden rounded-2xl shadow-lg cursor-pointer"
              style={{
                animationDelay: `${index * 100}ms`,
              }}
            >
              <div className={`relative h-72 ${index === 0 ? 'md:col-span-2 md:h-96' : ''}`}>
                <Image
                  src={item.src}
                  alt={locale === 'ar' ? item.titleAr : item.titleEn}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-300" />

                {/* المحتوى */}
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-3 py-1 bg-[#C8102E]/90 text-white text-xs font-semibold rounded-full">
                      {locale === 'ar' ? item.locationAr : item.locationEn}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1 group-hover:text-[#D4AF37] transition-colors">
                    {locale === 'ar' ? item.titleAr : item.titleEn}
                  </h3>
                </div>

                {/* أيقونة التكبير */}
                <div className="absolute top-4 right-4 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
