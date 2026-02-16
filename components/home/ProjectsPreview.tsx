'use client';

import { useLocale } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import SerialBadge from '../shared/SerialBadge';
import { projects } from '@/lib/data/projects';
import { getSiteContent } from '@/lib/data/siteContent';

const displayProjects = projects.slice(0, 3);

export default function ProjectsPreview() {
  const locale = useLocale();
  const content = getSiteContent().projects;

  return (
    <section className="py-32 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-20">
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            {locale === 'ar' ? content.titleAr : content.titleEn}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            {locale === 'ar' ? content.subtitleAr : content.subtitleEn}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-6xl mx-auto">
          {displayProjects.map((project) => (
            <div
              key={project.id}
              className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all transform hover:-translate-y-2"
            >
              <div className="h-72 relative">
                <Image
                  src={project.image}
                  alt={locale === 'ar' ? project.titleAr : project.titleEn}
                  fill
                  className="object-cover"
                  quality={85}
                  loading="lazy"
                  sizes="(max-width: 768px) 100vw, 33vw"
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
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-semibold text-gray-900 z-30">
                  {locale === 'ar' ? `${project.typeAr} – ${project.villageAr || project.locationAr}` : `${project.typeEn} – ${project.villageEn || project.locationEn}`}
                </div>
              </div>
              <div className="p-8">
                {'serialNumber' in project && (
                  <SerialBadge serialNumber={(project as { serialNumber?: string }).serialNumber!} compact className="mb-2" />
                )}
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  {locale === 'ar' ? project.titleAr : project.titleEn}
                </h3>
                <p className="text-gray-600 mb-6 text-base leading-relaxed">
                  {locale === 'ar' ? project.descriptionAr : project.descriptionEn}
                </p>
                <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                  <div className="text-2xl font-bold text-primary">
                    {project.price.toLocaleString()} ر.ع
                  </div>
                  <Link
                    href={`/${locale}/projects/${project.id}`}
                    prefetch={true}
                    className="text-primary hover:text-primary-dark font-semibold text-sm inline-flex items-center gap-2"
                  >
                    {locale === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                    <span>→</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
