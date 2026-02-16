'use client';

import { useState } from 'react';
import Image from 'next/image';

interface PropertyImageSliderProps {
  images: string[];
  alt: string;
  type: 'RENT' | 'SALE';
  locale: string;
  /** حالة العقار - عند RESERVED تظهر شارة محجوز */
  businessStatus?: string;
}

export default function PropertyImageSlider({ images, alt, type, locale, businessStatus }: PropertyImageSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === images.length - 1 ? 0 : prevIndex + 1
    );
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  if (images.length === 0) return null;

  return (
    <div className="relative w-full">
      {/* Main Image */}
      <div className="relative h-80 md:h-[500px] rounded-2xl overflow-hidden shadow-xl">
        <Image
          src={images[currentIndex]}
          alt={`${alt} - ${currentIndex + 1}`}
          fill
          className="object-cover"
          priority={currentIndex === 0}
          quality={85}
          sizes="100vw"
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
        {/* Type Badge + محجوز - بجانب بعض في أعلى اليسار */}
        <div 
          className="absolute top-6 left-6 flex flex-wrap items-center gap-2 z-30"
          style={{ backdropFilter: 'blur(10px)' }}
        >
          <div 
            className={`px-8 py-4 rounded-xl font-bold text-xl md:text-2xl shadow-2xl ${
              type === 'RENT' 
                ? 'bg-blue-600 text-white border-4 border-blue-300'
                : 'bg-green-600 text-white border-4 border-green-300'
            }`}
            style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)' }}
          >
            {type === 'RENT' 
              ? (locale === 'ar' ? 'للإيجار' : 'FOR RENT')
              : (locale === 'ar' ? 'للبيع' : 'FOR SALE')}
          </div>
          {businessStatus === 'RESERVED' && (
            <div 
              className="px-8 py-4 rounded-xl font-bold text-xl md:text-2xl shadow-2xl bg-white/95 text-red-600 border-4 border-red-500"
              style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)' }}
            >
              {locale === 'ar' ? 'محجوز' : 'RESERVED'}
            </div>
          )}
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
        {images.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-900 p-3 rounded-full shadow-lg transition-all z-10"
              aria-label="Previous image"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-900 p-3 rounded-full shadow-lg transition-all z-10"
              aria-label="Next image"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* Image Counter */}
        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full text-sm font-semibold z-10">
            {currentIndex + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Thumbnail Navigation */}
      {images.length > 1 && (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
          {images.map((image, index) => (
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
                src={image}
                alt={`${alt} thumbnail ${index + 1}`}
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
  );
}
