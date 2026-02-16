'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useLocale } from 'next-intl';

interface BuildingMapsProps {
  maps: string[];
  alt: string;
}

export default function BuildingMaps({ maps, alt }: BuildingMapsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const locale = useLocale();

  if (!maps || maps.length === 0) return null;

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? maps.length - 1 : prevIndex - 1
    );
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === maps.length - 1 ? 0 : prevIndex + 1
    );
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Accordion Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
      >
        <h2 className="text-2xl font-bold text-gray-900" style={{ lineHeight: '1.5' }}>
          {locale === 'ar' ? 'خرائط المبنى' : 'Building Maps'}
        </h2>
        <svg
          className={`w-6 h-6 text-gray-600 transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Accordion Content */}
      {isOpen && (
        <div className="p-6 pt-0">
          <div className="relative w-full">
            {/* Main Map Image */}
            <div className="relative h-96 md:h-[600px] rounded-xl overflow-hidden shadow-xl bg-gray-100">
              <Image
                src={maps[currentIndex]}
                alt={`${alt} - Map ${currentIndex + 1}`}
                fill
                className="object-contain"
                priority={currentIndex === 0}
              />
              {/* Center Watermark - Transparent */}
              <div 
                className="absolute inset-0 flex items-center justify-center pointer-events-none" 
                style={{ zIndex: 15 }}
              >
                <Image
                  src="/logo-bhd.png"
                  alt="BHD Logo"
                  width={250}
                  height={250}
                  className="logo-golden-filter"
                  style={{ 
                    opacity: 0.3,
                    objectFit: 'contain',
                    pointerEvents: 'none'
                  }}
                  loading="lazy"
                />
              </div>
              {/* Watermark Logo - Right Top Only */}
              <div 
                className="absolute right-2 top-2 pointer-events-none" 
                style={{ zIndex: 20 }}
              >
                <Image
                  src="/logo-bhd.png"
                  alt="BHD Logo"
                  width={80}
                  height={80}
                  className="logo-golden-filter"
                  style={{ 
                    opacity: 0.9,
                    objectFit: 'contain',
                    pointerEvents: 'none'
                  }}
                  loading="lazy"
                />
              </div>
              
              {/* Navigation Arrows */}
              {maps.length > 1 && (
                <>
                  <button
                    onClick={goToPrevious}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-900 p-3 rounded-full shadow-lg transition-all z-10"
                    aria-label="Previous map"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={goToNext}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-900 p-3 rounded-full shadow-lg transition-all z-10"
                    aria-label="Next map"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}

              {/* Map Counter */}
              {maps.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full text-sm font-semibold z-10">
                  {currentIndex + 1} / {maps.length}
                </div>
              )}
            </div>

            {/* Thumbnail Navigation */}
            {maps.length > 1 && (
              <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                {maps.map((map, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlide(index)}
                    className={`relative flex-shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-lg overflow-hidden border-2 transition-all ${
                      currentIndex === index
                        ? 'border-primary shadow-lg scale-105'
                        : 'border-gray-200 hover:border-gray-300 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <Image
                      src={map}
                      alt={`${alt} map thumbnail ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                    {/* Watermark Logo on Thumbnail */}
                    <div 
                      className="absolute right-1 top-1 pointer-events-none" 
                      style={{ zIndex: 10 }}
                    >
                      <Image
                        src="/logo-bhd.png"
                        alt="BHD Logo"
                        width={16}
                        height={16}
                        className="logo-golden-filter"
                        style={{ 
                          opacity: 0.7,
                          objectFit: 'contain',
                          pointerEvents: 'none'
                        }}
                        loading="lazy"
                      />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
