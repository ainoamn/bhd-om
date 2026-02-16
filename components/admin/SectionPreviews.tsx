'use client';

import Image from 'next/image';
import type { SiteContentStore } from '@/lib/data/siteContent';
import PageHero from '@/components/shared/PageHero';

interface SectionPreviewsProps {
  blockKey: string;
  content: SiteContentStore;
  locale: string;
}

/**
 * معاينة الأقسام كما تظهر في الموقع - للوحة إدارة الموقع
 */
export default function SectionPreviews({ blockKey, content, locale }: SectionPreviewsProps) {
  const isAr = locale === 'ar';

  if (blockKey === 'hero') {
    const hero = content.hero;
    return (
      <div className="rounded-xl overflow-hidden border-2 border-gray-200 shadow-lg">
        <PageHero
          title={isAr ? hero.titleAr : hero.titleEn}
          subtitle={isAr ? hero.subtitleAr : hero.subtitleEn}
          backgroundImage={hero.backgroundImage}
          description={isAr ? hero.descriptionAr : hero.descriptionEn}
          showNavigation={false}
          showStatistics={true}
        />
      </div>
    );
  }

  if (blockKey === 'about') {
    const about = content.about;
    return (
      <section className="py-16 bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6 leading-tight">
                {isAr ? about.titleAr : about.titleEn}
              </h2>
              <p className="text-lg text-gray-700 leading-relaxed">
                {isAr ? about.descriptionAr : about.descriptionEn}
              </p>
            </div>
            <div className="relative h-[400px] rounded-xl overflow-hidden shadow-xl">
              <Image
                src={about.image}
                alt={isAr ? 'عمارة عمانية' : 'Omani Architecture'}
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (blockKey === 'services') {
    const services = content.services;
    return (
      <section className="py-16 bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              {isAr ? services.titleAr : services.titleEn}
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
              {isAr ? services.subtitleAr : services.subtitleEn}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {services.items.map((service, index) => (
              <div key={index} className="bg-gray-50 rounded-xl p-8 hover:bg-gray-100 transition-colors">
                <div className="flex items-start gap-6">
                  <div className="text-4xl font-bold text-primary opacity-50">{service.number}</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {isAr ? service.titleAr : service.titleEn}
                    </h3>
                    <p className="text-gray-600 leading-relaxed text-sm">
                      {isAr ? service.descAr : service.descEn}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (blockKey === 'propertiesRent' || blockKey === 'propertiesSale') {
    const propsContent = blockKey === 'propertiesRent' ? content.propertiesRent : content.propertiesSale;
    return (
      <section className="py-12 bg-gray-50 rounded-xl border-2 border-gray-200 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {isAr ? propsContent.titleAr : propsContent.titleEn}
            </h2>
            <p className="text-gray-600 text-lg">
              {isAr ? propsContent.subtitleAr : propsContent.subtitleEn}
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (blockKey === 'pagesProperties') {
    const p = content.pagesProperties;
    return (
      <div className="rounded-xl overflow-hidden border-2 border-gray-200">
        <PageHero
          title={isAr ? p.heroTitleAr : p.heroTitleEn}
          subtitle={isAr ? p.heroSubtitleAr : p.heroSubtitleEn}
          backgroundImage={p.heroImage}
          showNavigation={false}
          showStatistics={false}
        />
      </div>
    );
  }

  if (blockKey === 'pagesProjects') {
    const p = content.pagesProjects;
    return (
      <div className="rounded-xl overflow-hidden border-2 border-gray-200">
        <PageHero
          title={isAr ? p.heroTitleAr : p.heroTitleEn}
          description={isAr ? p.heroDescriptionAr : p.heroDescriptionEn}
          backgroundImage={p.heroImage}
          showNavigation={false}
          showStatistics={false}
        />
      </div>
    );
  }

  if (blockKey === 'pagesServices') {
    const p = content.pagesServices;
    return (
      <div className="rounded-xl overflow-hidden border-2 border-gray-200">
        <PageHero
          title={isAr ? p.heroTitleAr : p.heroTitleEn}
          subtitle={isAr ? p.heroSubtitleAr : p.heroSubtitleEn}
          backgroundImage={p.heroImage}
          showNavigation={false}
          showStatistics={false}
        />
      </div>
    );
  }

  if (blockKey === 'pagesAbout') {
    const p = content.pagesAbout;
    return (
      <div className="space-y-4">
        <div className="rounded-xl overflow-hidden border-2 border-gray-200">
          <PageHero
            title={isAr ? p.heroTitleAr : p.heroTitleEn}
            subtitle={isAr ? p.heroSubtitleAr : p.heroSubtitleEn}
            backgroundImage={p.heroImage}
            showNavigation={false}
            showStatistics={false}
          />
        </div>
        <section className="py-8 bg-white rounded-xl border-2 border-gray-200 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{isAr ? p.mainTitleAr : p.mainTitleEn}</h2>
          <p className="text-gray-700 leading-relaxed mb-4">{isAr ? p.contentAr : p.contentEn}</p>
          <div className="relative h-48 rounded-lg overflow-hidden">
            <Image src={p.image} alt="" fill className="object-cover" />
          </div>
        </section>
      </div>
    );
  }

  if (blockKey === 'pagesContact') {
    const p = content.pagesContact;
    return (
      <div className="rounded-xl overflow-hidden border-2 border-gray-200">
        <PageHero
          title={isAr ? p.heroTitleAr : p.heroTitleEn}
          subtitle={isAr ? p.heroSubtitleAr : p.heroSubtitleEn}
          backgroundImage={p.heroImage}
          showNavigation={false}
          showStatistics={false}
        />
      </div>
    );
  }

  if (blockKey === 'projects') {
    const projects = content.projects;
    return (
      <section className="py-12 bg-gray-50 rounded-xl border-2 border-gray-200 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              {isAr ? projects.titleAr : projects.titleEn}
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              {isAr ? projects.subtitleAr : projects.subtitleEn}
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (blockKey === 'contact') {
    const contact = content.contact;
    return (
      <section className="py-12 bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                {isAr ? contact.titleAr : contact.titleEn}
              </h2>
              <h3 className="text-2xl font-semibold text-gray-700">
                {isAr ? contact.subtitleAr : contact.subtitleEn}
              </h3>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return null;
}
