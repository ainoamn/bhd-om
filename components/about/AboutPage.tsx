'use client';

import { useLocale } from 'next-intl';
import Image from 'next/image';
import PageHero from '../shared/PageHero';
import AdsDisplay from '../ads/AdsDisplay';
import { getSiteContent } from '@/lib/data/siteContent';

export default function AboutPage() {
  const locale = useLocale();
  const pageContent = getSiteContent().pagesAbout;

  return (
    <div className="bg-white">
      <PageHero
        title={locale === 'ar' ? pageContent.heroTitleAr : pageContent.heroTitleEn}
        subtitle={locale === 'ar' ? pageContent.heroSubtitleAr : pageContent.heroSubtitleEn}
        backgroundImage={pageContent.heroImage}
      />
      <AdsDisplay position="below_header" />

      {/* About Content */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="prose prose-lg max-w-none">
              <div className="mb-12">
                <div className="relative h-96 rounded-xl overflow-hidden shadow-2xl mb-8">
                  <Image
                    src={pageContent.image}
                    alt={locale === 'ar' ? 'عن الشركة' : 'About Us'}
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
                <h2 className="text-3xl font-bold text-gray-900 mb-6">
                  {locale === 'ar' ? pageContent.mainTitleAr : pageContent.mainTitleEn}
                </h2>
                <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                  {locale === 'ar' ? pageContent.contentAr : pageContent.contentEn}
                </p>
                <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                  {locale === 'ar'
                    ? 'نحن ملتزمون بتقديم أعلى معايير الجودة والتميز في كل مشروع نقوم به، مع التركيز على الابتكار والاستدامة والرضا الكامل للعملاء. فريقنا المتمرس يجمع بين الخبرة المحلية والمعرفة العالمية لضمان نجاح كل مشروع.'
                    : 'We are committed to delivering the highest standards of quality and excellence in every project we undertake, with a focus on innovation, sustainability, and complete customer satisfaction. Our experienced team combines local expertise with global knowledge to ensure the success of every project.'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                <div className="bg-gray-50 p-8 rounded-xl">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    {locale === 'ar' ? 'رؤيتنا' : 'Our Vision'}
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    {locale === 'ar'
                      ? 'أن نكون الشركة الرائدة في مجال التطوير العقاري في سلطنة عمان، معترف بها محلياً وإقليمياً لتميزنا وجودة خدماتنا.'
                      : 'To be the leading company in real estate development in the Sultanate of Oman, recognized locally and regionally for our excellence and quality of services.'}
                  </p>
                </div>

                <div className="bg-gray-50 p-8 rounded-xl">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    {locale === 'ar' ? 'رسالتنا' : 'Our Mission'}
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    {locale === 'ar'
                      ? 'تقديم حلول تطوير عقاري متكاملة ومبتكرة تلبي احتياجات عملائنا وتتجاوز توقعاتهم، مع الالتزام بأعلى معايير الجودة والاستدامة.'
                      : 'To provide integrated and innovative real estate development solutions that meet our clients\' needs and exceed their expectations, while adhering to the highest standards of quality and sustainability.'}
                  </p>
                </div>
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-4 mt-8">
                {locale === 'ar' ? 'قيمنا' : 'Our Values'}
              </h3>
              <ul className="list-disc list-inside text-lg text-gray-700 space-y-2 mb-6">
                <li>{locale === 'ar' ? 'الشفافية في جميع معاملاتنا' : 'Transparency in all our transactions'}</li>
                <li>{locale === 'ar' ? 'الالتزام بجودة الخدمة' : 'Commitment to service quality'}</li>
                <li>{locale === 'ar' ? 'الاحترام والثقة مع عملائنا' : 'Respect and trust with our clients'}</li>
                <li>{locale === 'ar' ? 'الابتكار في الحلول العقارية' : 'Innovation in real estate solutions'}</li>
                <li>{locale === 'ar' ? 'الاستجابة السريعة لاحتياجات العملاء' : 'Quick response to customer needs'}</li>
                <li>{locale === 'ar' ? 'الاستدامة والمسؤولية البيئية' : 'Sustainability and environmental responsibility'}</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
