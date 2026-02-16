'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import PageHero from '../shared/PageHero';
import AdsDisplay from '../ads/AdsDisplay';
import SerialBadge from '../shared/SerialBadge';
import { projects } from '@/lib/data/projects';
import { getSiteContent } from '@/lib/data/siteContent';

export default function ProjectsList() {
  const t = useTranslations('projects');
  const locale = useLocale();
  const [filter, setFilter] = useState<string>('ALL');

  const filteredProjects = filter === 'ALL' 
    ? projects 
    : projects.filter(p => p.status === filter);

  const pageContent = getSiteContent().pagesProjects;

  return (
    <div className="min-h-screen bg-white" data-page="projects">
      <PageHero
        title={locale === 'ar' ? pageContent.heroTitleAr : pageContent.heroTitleEn}
        description={locale === 'ar' ? pageContent.heroDescriptionAr : pageContent.heroDescriptionEn}
        backgroundImage={pageContent.heroImage}
      />
      <AdsDisplay position="below_header" />

      {/* Featured Properties Section */}
      <section className="bg-white py-16 md:py-20">
        <div className="container mx-auto px-4">

          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-4 justify-center mb-12">
            {[
              { key: 'ALL', label: locale === 'ar' ? 'الكل' : 'All' },
              { key: 'UNDER_CONSTRUCTION', label: t('underConstruction') },
              { key: 'UNDER_DEVELOPMENT', label: t('underDevelopment') },
              { key: 'COMPLETED', label: t('completed') },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-10 py-4 rounded-lg text-lg font-semibold transition-all border-2 ${
                  filter === key
                    ? 'bg-primary text-white shadow-lg border-primary'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border-primary/50 hover:border-primary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Projects Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {filteredProjects.map((project) => {
              const formatDate = (dateString: string) => {
                const date = new Date(dateString);
                return locale === 'ar' 
                  ? date.toLocaleDateString('ar-OM', { year: 'numeric', month: 'long', day: 'numeric' })
                  : date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
              };

              return (
                <div
                  key={project.id}
                  className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <Link href={`/${locale}/projects/${project.id}`} prefetch={true}>
                    <div className="relative h-64 overflow-hidden cursor-pointer">
                      <Image
                        src={project.image}
                        alt={locale === 'ar' ? project.titleAr : project.titleEn}
                        fill
                        className="object-cover hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        quality={85}
                        loading="lazy"
                      />
                      {/* Center Watermark - Transparent */}
                      <div 
                        className="absolute inset-0 flex items-center justify-center pointer-events-none" 
                        style={{ zIndex: 15 }}
                      >
                        <Image
                          src="/logo-bhd.png"
                          alt="BHD Logo"
                          width={200}
                          height={200}
                          className="logo-golden-filter"
                          style={{ 
                            opacity: 0.3,
                            objectFit: 'contain',
                            pointerEvents: 'none'
                          }}
                          loading="lazy"
                        />
                      </div>
                      {/* Corner Watermark - Right Top Only */}
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
                    </div>
                  </Link>
                  <div className="p-6">
                    {'serialNumber' in project && (
                      <SerialBadge serialNumber={(project as { serialNumber?: string }).serialNumber!} compact className="mb-2" />
                    )}
                    {/* 1. عنوان العقار */}
                    <h3 className="text-xl font-bold text-gray-900 mb-4 break-words" style={{ lineHeight: '1.5' }}>
                      {locale === 'ar' ? project.titleAr : project.titleEn}
                    </h3>
                    
                    {/* 2. وصف العقار */}
                    <p className="text-gray-600 mb-6 text-sm break-words" style={{ lineHeight: '1.5' }}>
                      {locale === 'ar' ? project.descriptionAr : project.descriptionEn}
                    </p>
                    
                    {/* 3. موقع العقار */}
                    <div className="mb-4" style={{ lineHeight: '1.5' }}>
                      <div className="flex items-center gap-2 mb-1">
                        <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-xs text-gray-500 font-medium">
                          {locale === 'ar' ? 'الموقع' : 'Location'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-700 font-semibold" style={{ lineHeight: '1.5' }}>
                        {project.governorateAr && project.stateAr && project.villageAr ? (
                          locale === 'ar' 
                            ? `${project.villageAr} - ${project.stateAr} - ${project.governorateAr}`
                            : `${project.villageEn} - ${project.stateEn} - ${project.governorateEn}`
                        ) : (
                          locale === 'ar' ? project.locationAr : project.locationEn
                        )}
                      </div>
                    </div>
                    
                    {/* 4. قيمة العقار أو العقد */}
                    <div className="mb-3">
                      <div className="text-xs text-gray-500 mb-2" style={{ lineHeight: '1.5' }}>
                        {locale === 'ar' ? 'قيمة المشروع' : 'Project Value'}
                      </div>
                      <div className="flex items-center gap-2 text-2xl font-bold text-primary" style={{ lineHeight: '1.5' }}>
                        {project.price.toLocaleString()}
                        <img
                          src="/omr-symbol.png"
                          alt="OMR"
                          className="object-contain"
                          style={{ width: '28px', height: '28px', display: 'inline-block' }}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      </div>
                    </div>
                    
                    {/* 5. تاريخ البدء */}
                    <div className="mb-3">
                      <div className="text-xs text-gray-500 mb-2" style={{ lineHeight: '1.5' }}>
                        {locale === 'ar' ? 'تاريخ البدء' : 'Start Date'}
                      </div>
                      <div className="text-sm text-gray-700 font-medium" style={{ lineHeight: '1.5' }}>
                        {formatDate(project.startDate)}
                      </div>
                    </div>
                    
                    {/* 6. تاريخ الانتهاء */}
                    <div className="mb-6">
                      <div className="text-xs text-gray-500 mb-2" style={{ lineHeight: '1.5' }}>
                        {locale === 'ar' ? 'تاريخ الانتهاء' : 'End Date'}
                      </div>
                      <div className="text-sm text-gray-700 font-medium" style={{ lineHeight: '1.5' }}>
                        {formatDate(project.endDate)}
                      </div>
                    </div>
                    
                    {/* زر عرض التفاصيل */}
                    <Link 
                      href={`/${locale}/projects/${project.id}`}
                      prefetch={true}
                      className="block w-full text-center bg-primary text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-primary-dark transition-colors"
                    >
                      {locale === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
