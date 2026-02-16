'use client';

import { useLocale } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import PageHero from '../shared/PageHero';
import AdsDisplay from '../ads/AdsDisplay';
import SerialBadge from '../shared/SerialBadge';
import ImageSlider from './ImageSlider';
import BuildingMaps from './BuildingMaps';

interface Project {
  id: number;
  serialNumber?: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  status: string;
  locationAr: string;
  locationEn: string;
  governorateAr?: string;
  governorateEn?: string;
  stateAr?: string;
  stateEn?: string;
  villageAr?: string;
  villageEn?: string;
  typeAr: string;
  typeEn: string;
  area: number;
  units: number;
  price: number;
  startDate: string;
  endDate: string;
  image: string;
  images?: string[];
  buildingMaps?: string[];
  videoUrl?: string;
  googleMapsUrl?: string;
  lat?: number;
  lng?: number;
  // Additional specifications
  bedrooms?: number;
  livingRooms?: number;
  kitchens?: number;
  bathrooms?: number;
  majlis?: number;
  parkingSpaces?: number;
  floors?: number;
  balconies?: number;
}

interface ProjectDetailsProps {
  project: Project;
  locale: string;
}

export default function ProjectDetails({ project, locale }: ProjectDetailsProps) {
  const currentLocale = useLocale();
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return currentLocale === 'ar' 
      ? date.toLocaleDateString('ar-OM', { year: 'numeric', month: 'long', day: 'numeric' })
      : date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const getStatusLabel = () => {
    if (currentLocale === 'ar') {
      switch (project.status) {
        case 'COMPLETED': return 'مشاريع منفذة';
        case 'UNDER_CONSTRUCTION': return 'قيد البناء';
        case 'UNDER_DEVELOPMENT': return 'قيد التطوير';
        default: return project.status;
      }
    } else {
      switch (project.status) {
        case 'COMPLETED': return 'Completed';
        case 'UNDER_CONSTRUCTION': return 'Under Construction';
        case 'UNDER_DEVELOPMENT': return 'Under Development';
        default: return project.status;
      }
    }
  };

  const getStatusColor = () => {
    switch (project.status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800 border-green-200';
      case 'UNDER_CONSTRUCTION': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'UNDER_DEVELOPMENT': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getVideoEmbedUrl = (url: string) => {
    if (!url) return '';
    
    // YouTube
    if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
      const videoId = url.includes('youtu.be/')
        ? url.split('youtu.be/')[1].split('?')[0]
        : url.split('v=')[1]?.split('&')[0];
      return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
    }
    
    // YouTube embed already
    if (url.includes('youtube.com/embed')) {
      return url;
    }
    
    // Vimeo
    if (url.includes('vimeo.com/')) {
      const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
      return videoId ? `https://player.vimeo.com/video/${videoId}` : url;
    }
    
    // Vimeo embed already
    if (url.includes('player.vimeo.com')) {
      return url;
    }
    
    // Return as is if already an embed URL
    return url;
  };

  // Google Maps embed URL using location name
  const locationQuery = encodeURIComponent(
    currentLocale === 'ar' ? project.locationAr : project.locationEn
  );
  // Using Google Maps embed with location search (works without API key for basic embedding)
  const mapEmbedUrl = project.lat && project.lng
    ? `https://maps.google.com/maps?q=${project.lat},${project.lng}&hl=${currentLocale === 'ar' ? 'ar' : 'en'}&z=15&output=embed`
    : `https://maps.google.com/maps?q=${locationQuery}&hl=${currentLocale === 'ar' ? 'ar' : 'en'}&z=15&output=embed`;

  return (
    <div className="min-h-screen bg-gray-50" data-page="projects">
      <PageHero
        title={currentLocale === 'ar' ? project.titleAr : project.titleEn}
        backgroundImage={project.image}
      />
      <AdsDisplay position="below_header" />

      {/* Project Details Section */}
      <section className="bg-white py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            {/* Back Button */}
            <Link
              href={`/${locale}/projects`}
              prefetch={true}
              className="inline-flex items-center gap-2 text-primary hover:text-primary-dark mb-8 font-semibold transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={currentLocale === 'ar' ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"} />
              </svg>
              {currentLocale === 'ar' ? 'العودة إلى المشاريع' : 'Back to Projects'}
            </Link>

            {project.serialNumber && (
              <SerialBadge serialNumber={project.serialNumber} className="mb-6" />
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
              {/* Left Column - Main Info (2/3 width) */}
              <div className="lg:col-span-2 space-y-8">
                {/* Project Images Slider */}
                {project.images && project.images.length > 0 ? (
                  <ImageSlider
                    images={project.images}
                    alt={currentLocale === 'ar' ? project.titleAr : project.titleEn}
                  />
                ) : (
                  <div className="relative h-80 md:h-[500px] rounded-2xl overflow-hidden shadow-xl">
                    <Image
                      src={project.image}
                      alt={currentLocale === 'ar' ? project.titleAr : project.titleEn}
                      fill
                      className="object-cover"
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
                  </div>
                )}

                {/* Video Section */}
                {project.videoUrl && (
                  <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                    <h2 className="text-2xl font-bold text-gray-900 mb-8" style={{ lineHeight: '1.5' }}>
                      {currentLocale === 'ar' ? 'فيديو المشروع' : 'Project Video'}
                    </h2>
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100">
                      <iframe
                        src={getVideoEmbedUrl(project.videoUrl)}
                        className="absolute top-0 left-0 w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={currentLocale === 'ar' ? project.titleAr : project.titleEn}
                      ></iframe>
                    </div>
                  </div>
                )}

                {/* Building Maps Section */}
                {project.buildingMaps && project.buildingMaps.length > 0 && (
                  <BuildingMaps
                    maps={project.buildingMaps}
                    alt={currentLocale === 'ar' ? project.titleAr : project.titleEn}
                  />
                )}

                {/* Title and Status */}
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <span className={`inline-block px-4 py-2 rounded-lg text-sm font-semibold border-2 ${getStatusColor()}`}>
                      {getStatusLabel()}
                    </span>
                  </div>
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-8 leading-tight">
                    {currentLocale === 'ar' ? project.titleAr : project.titleEn}
                  </h1>
                  <p className="text-lg md:text-xl text-gray-600 mb-8" style={{ lineHeight: '1.5' }}>
                    {currentLocale === 'ar' ? project.descriptionAr : project.descriptionEn}
                  </p>
                </div>

                {/* Project Specifications */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm">
                  <h2 className="text-2xl font-bold text-gray-900 mb-8">
                    {currentLocale === 'ar' ? 'مواصفات المشروع' : 'Project Specifications'}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 mb-2" style={{ lineHeight: '1.5' }}>
                          {currentLocale === 'ar' ? 'المساحة' : 'Area'}
                        </div>
                        <div className="text-xl font-bold text-gray-900" style={{ lineHeight: '1.5' }}>
                          {project.area.toLocaleString()} {currentLocale === 'ar' ? 'متر مربع' : 'sqm'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 mb-2" style={{ lineHeight: '1.5' }}>
                          {currentLocale === 'ar' ? 'عدد الوحدات' : 'Units'}
                        </div>
                        <div className="text-xl font-bold text-gray-900" style={{ lineHeight: '1.5' }}>
                          {project.units} {currentLocale === 'ar' ? 'وحدة' : 'units'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 mb-2" style={{ lineHeight: '1.5' }}>
                          {currentLocale === 'ar' ? 'نوع المشروع' : 'Project Type'}
                        </div>
                        <div className="text-xl font-bold text-gray-900" style={{ lineHeight: '1.5' }}>
                          {currentLocale === 'ar' ? project.typeAr : project.typeEn}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 mb-2" style={{ lineHeight: '1.5' }}>
                          {currentLocale === 'ar' ? 'الموقع' : 'Location'}
                        </div>
                        <div className="text-xl font-bold text-gray-900" style={{ lineHeight: '1.5' }}>
                          {project.governorateAr && project.stateAr && project.villageAr ? (
                            currentLocale === 'ar' 
                              ? `${project.villageAr} - ${project.stateAr} - ${project.governorateAr}`
                              : `${project.villageEn} - ${project.stateEn} - ${project.governorateEn}`
                          ) : (
                            currentLocale === 'ar' ? project.locationAr : project.locationEn
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Additional Specifications */}
                    {project.bedrooms && (
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                          <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500 mb-2" style={{ lineHeight: '1.5' }}>
                            {currentLocale === 'ar' ? 'عدد الغرف' : 'Bedrooms'}
                          </div>
                          <div className="text-xl font-bold text-gray-900" style={{ lineHeight: '1.5' }}>
                            {project.bedrooms} {currentLocale === 'ar' ? 'غرفة' : 'bedrooms'}
                          </div>
                        </div>
                      </div>
                    )}

                    {project.livingRooms && (
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                          <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500 mb-2" style={{ lineHeight: '1.5' }}>
                            {currentLocale === 'ar' ? 'عدد الصالات' : 'Living Rooms'}
                          </div>
                          <div className="text-xl font-bold text-gray-900" style={{ lineHeight: '1.5' }}>
                            {project.livingRooms} {currentLocale === 'ar' ? 'صالة' : 'living rooms'}
                          </div>
                        </div>
                      </div>
                    )}

                    {project.kitchens && (
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                          <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500 mb-2" style={{ lineHeight: '1.5' }}>
                            {currentLocale === 'ar' ? 'عدد المطابخ' : 'Kitchens'}
                          </div>
                          <div className="text-xl font-bold text-gray-900" style={{ lineHeight: '1.5' }}>
                            {project.kitchens} {currentLocale === 'ar' ? 'مطبخ' : 'kitchens'}
                          </div>
                        </div>
                      </div>
                    )}

                    {project.bathrooms && (
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                          <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500 mb-2" style={{ lineHeight: '1.5' }}>
                            {currentLocale === 'ar' ? 'عدد دورات المياه' : 'Bathrooms'}
                          </div>
                          <div className="text-xl font-bold text-gray-900" style={{ lineHeight: '1.5' }}>
                            {project.bathrooms} {currentLocale === 'ar' ? 'دورة مياه' : 'bathrooms'}
                          </div>
                        </div>
                      </div>
                    )}

                    {project.majlis && (
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                          <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500 mb-2" style={{ lineHeight: '1.5' }}>
                            {currentLocale === 'ar' ? 'عدد المجالس' : 'Majlis'}
                          </div>
                          <div className="text-xl font-bold text-gray-900" style={{ lineHeight: '1.5' }}>
                            {project.majlis} {currentLocale === 'ar' ? 'مجلس' : 'majlis'}
                          </div>
                        </div>
                      </div>
                    )}

                    {project.parkingSpaces && (
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                          <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500 mb-2" style={{ lineHeight: '1.5' }}>
                            {currentLocale === 'ar' ? 'مواقف السيارات' : 'Parking Spaces'}
                          </div>
                          <div className="text-xl font-bold text-gray-900" style={{ lineHeight: '1.5' }}>
                            {project.parkingSpaces} {currentLocale === 'ar' ? 'موقف' : 'spaces'}
                          </div>
                        </div>
                      </div>
                    )}

                    {project.floors && (
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                          <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500 mb-2" style={{ lineHeight: '1.5' }}>
                            {currentLocale === 'ar' ? 'عدد الطوابق' : 'Floors'}
                          </div>
                          <div className="text-xl font-bold text-gray-900" style={{ lineHeight: '1.5' }}>
                            {project.floors} {currentLocale === 'ar' ? 'طابق' : 'floors'}
                          </div>
                        </div>
                      </div>
                    )}

                    {project.balconies && (
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                          <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500 mb-2" style={{ lineHeight: '1.5' }}>
                            {currentLocale === 'ar' ? 'عدد الشرفات' : 'Balconies'}
                          </div>
                          <div className="text-xl font-bold text-gray-900" style={{ lineHeight: '1.5' }}>
                            {project.balconies} {currentLocale === 'ar' ? 'شرفة' : 'balconies'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column - Key Info (1/3 width) */}
              <div className="space-y-6">
                {/* Project Value Card */}
                <div className="bg-gradient-to-br from-primary to-primary-dark rounded-2xl p-6 md:p-8 text-white shadow-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm opacity-90 mb-3" style={{ lineHeight: '1.5' }}>
                        {currentLocale === 'ar' ? 'قيمة المشروع' : 'Project Value'}
                      </div>
                      <div className="flex items-center gap-2 text-3xl md:text-4xl font-bold" style={{ lineHeight: '1.5' }}>
                        {project.price.toLocaleString()}
                        <img
                          src="/omr-symbol.png"
                          alt="OMR"
                          className="object-contain"
                          style={{ width: '40px', height: '40px', display: 'inline-block' }}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline Card */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 mb-8" style={{ lineHeight: '1.5' }}>
                    {currentLocale === 'ar' ? 'الجدول الزمني' : 'Timeline'}
                  </h3>
                  <div className="space-y-6">
                    <div className="relative">
                      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary"></div>
                      <div className="pl-6">
                        <div className="absolute left-0 top-1 w-3 h-3 bg-primary rounded-full -translate-x-1.5"></div>
                        <div className="text-sm text-gray-500 mb-2" style={{ lineHeight: '1.5' }}>
                          {currentLocale === 'ar' ? 'تاريخ البدء' : 'Start Date'}
                        </div>
                        <div className="text-lg font-semibold text-gray-900" style={{ lineHeight: '1.5' }}>
                          {formatDate(project.startDate)}
                        </div>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary"></div>
                      <div className="pl-6">
                        <div className="absolute left-0 top-1 w-3 h-3 bg-primary rounded-full -translate-x-1.5"></div>
                        <div className="text-sm text-gray-500 mb-2" style={{ lineHeight: '1.5' }}>
                          {currentLocale === 'ar' ? 'تاريخ الانتهاء' : 'End Date'}
                        </div>
                        <div className="text-lg font-semibold text-gray-900" style={{ lineHeight: '1.5' }}>
                          {formatDate(project.endDate)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact Card */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 mb-6" style={{ lineHeight: '1.5' }}>
                    {currentLocale === 'ar' ? 'للتواصل' : 'Contact Us'}
                  </h3>
                  <p className="text-gray-600 mb-6 text-sm" style={{ lineHeight: '1.5' }}>
                    {currentLocale === 'ar' 
                      ? 'للمزيد من المعلومات حول هذا المشروع، يرجى التواصل معنا'
                      : 'For more information about this project, please contact us'}
                  </p>
                  <Link
                    href={`/${locale}/contact`}
                    prefetch={true}
                    className="block w-full text-center bg-primary text-white px-4 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors"
                  >
                    {currentLocale === 'ar' ? 'اتصل بنا' : 'Contact Us'}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="bg-white py-12 md:py-16 border-t border-gray-200">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 text-center">
              {currentLocale === 'ar' ? 'موقع المشروع' : 'Project Location'}
            </h2>
            
            {/* Google Maps Link */}
            {project.googleMapsUrl && (
              <div className="mb-6 text-center">
                <a
                  href={project.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors shadow-lg hover:shadow-xl"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {currentLocale === 'ar' ? 'فتح موقع المشروع في خرائط جوجل' : 'Open Project Location in Google Maps'}
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            )}

            <div className="rounded-2xl overflow-hidden shadow-xl border border-gray-200">
              <iframe
                width="100%"
                height="500"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                src={mapEmbedUrl}
              ></iframe>
            </div>
            <div className="mt-6 text-center">
              <p className="text-gray-600 mb-4" style={{ lineHeight: '1.5' }}>
                {currentLocale === 'ar' 
                  ? `الموقع: ${project.governorateAr && project.stateAr && project.villageAr 
                      ? `${project.villageAr} - ${project.stateAr} - ${project.governorateAr}`
                      : project.locationAr}`
                  : `Location: ${project.governorateEn && project.stateEn && project.villageEn
                      ? `${project.villageEn} - ${project.stateEn} - ${project.governorateEn}`
                      : project.locationEn}`}
              </p>
              {!project.googleMapsUrl && (
                <a
                  href={project.lat && project.lng 
                    ? `https://www.google.com/maps/search/?api=1&query=${project.lat},${project.lng}`
                    : `https://www.google.com/maps/search/?api=1&query=${locationQuery}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-primary hover:text-primary-dark font-semibold"
                >
                  {currentLocale === 'ar' ? 'فتح في خرائط جوجل' : 'Open in Google Maps'}
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
