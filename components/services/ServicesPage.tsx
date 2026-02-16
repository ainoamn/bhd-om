'use client';

import { useLocale } from 'next-intl';
import Image from 'next/image';
import PageHero from '../shared/PageHero';
import AdsDisplay from '../ads/AdsDisplay';
import { getSiteContent } from '@/lib/data/siteContent';

const services = [
  {
    icon: '🏗️',
    titleAr: 'التطوير العقاري',
    titleEn: 'Real Estate Development',
    descriptionAr: 'نقدم خدمات تطوير عقاري متكاملة تشمل التخطيط والتصميم والبناء والتسويق. نحن متخصصون في تطوير المشاريع السكنية والتجارية بمعايير عالمية.',
    descriptionEn: 'We provide integrated real estate development services including planning, design, construction, and marketing. We specialize in developing residential and commercial projects to international standards.',
    featuresAr: [
      'تخطيط وتصميم المشاريع',
      'إدارة البناء والتشييد',
      'التسويق والمبيعات',
      'إدارة ما بعد البيع',
    ],
    featuresEn: [
      'Project planning and design',
      'Construction management',
      'Marketing and sales',
      'Post-sale management',
    ],
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80',
  },
  {
    icon: '🏠',
    titleAr: 'إدارة العقارات',
    titleEn: 'Property Management',
    descriptionAr: 'خدمات إدارة عقارية شاملة تشمل الصيانة وجمع الإيجار وإدارة العلاقات مع المستأجرين. نضمن إدارة فعالة ومربحة لعقاراتك.',
    descriptionEn: 'Comprehensive property management services including maintenance, rent collection, and tenant relationship management. We ensure effective and profitable management of your properties.',
    featuresAr: [
      'إدارة يومية شاملة',
      'صيانة دورية',
      'جمع الإيجار',
      'تقارير دورية',
    ],
    featuresEn: [
      'Comprehensive daily management',
      'Regular maintenance',
      'Rent collection',
      'Periodic reports',
    ],
    image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80',
  },
  {
    icon: '💼',
    titleAr: 'الاستشارات الاستثمارية',
    titleEn: 'Investment Consulting',
    descriptionAr: 'نقدم استشارات متخصصة للاستثمار العقاري مع تحليل شامل للسوق وفرص الاستثمار. نساعدك في اتخاذ قرارات استثمارية مدروسة ومربحة.',
    descriptionEn: 'We provide specialized real estate investment consulting with comprehensive market analysis and investment opportunities. We help you make informed and profitable investment decisions.',
    featuresAr: [
      'تحليل السوق',
      'فرص استثمارية مدروسة',
      'عوائد عالية',
      'استشارات استثمارية',
    ],
    featuresEn: [
      'Market analysis',
      'Well-studied investment opportunities',
      'High returns',
      'Investment consulting',
    ],
    image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80',
  },
  {
    icon: '🔨',
    titleAr: 'البناء والتشييد',
    titleEn: 'Construction',
    descriptionAr: 'خدمات بناء وتشييد بمعايير عالمية مع استخدام أحدث التقنيات والمواد. نضمن جودة عالية وتنفيذ في الوقت المحدد.',
    descriptionEn: 'Construction services to international standards using the latest technologies and materials. We ensure high quality and on-time delivery.',
    featuresAr: [
      'بناء بمعايير عالمية',
      'استخدام أحدث التقنيات',
      'جودة عالية',
      'التنفيذ في الوقت المحدد',
    ],
    featuresEn: [
      'Construction to international standards',
      'Use of latest technologies',
      'High quality',
      'On-time delivery',
    ],
    image: 'https://images.unsplash.com/photo-1504307651254-35680f893dfe?w=800&q=80',
  },
];

export default function ServicesPage() {
  const locale = useLocale();
  const pageContent = getSiteContent().pagesServices;

  return (
    <div className="bg-white">
      <PageHero
        title={locale === 'ar' ? pageContent.heroTitleAr : pageContent.heroTitleEn}
        subtitle={locale === 'ar' ? pageContent.heroSubtitleAr : pageContent.heroSubtitleEn}
        backgroundImage={pageContent.heroImage}
      />
      <AdsDisplay position="below_header" />

      {/* Services Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="space-y-20">
            {services.map((service, index) => (
              <div
                key={index}
                className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${
                  index % 2 === 1 ? 'lg:flex-row-reverse' : ''
                }`}
              >
                <div className={index % 2 === 1 ? 'lg:order-2' : ''}>
                  <div className="text-6xl mb-4">{service.icon}</div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    {locale === 'ar' ? service.titleAr : service.titleEn}
                  </h2>
                  <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                    {locale === 'ar' ? service.descriptionAr : service.descriptionEn}
                  </p>
                  <ul className="space-y-3">
                    {(locale === 'ar' ? service.featuresAr : service.featuresEn).map((feature, idx) => (
                      <li key={idx} className="flex items-center text-gray-700">
                        <span className="text-primary ml-2 text-xl">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={`relative h-96 rounded-xl overflow-hidden shadow-2xl ${index % 2 === 1 ? 'lg:order-1' : ''}`}>
                  <Image
                    src={service.image}
                    alt={locale === 'ar' ? service.titleAr : service.titleEn}
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            {locale === 'ar'
              ? 'هل تحتاج إلى مساعدة في اختيار الخدمة المناسبة؟'
              : 'Need help choosing the right service?'}
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            {locale === 'ar'
              ? 'تواصل معنا اليوم وسنساعدك في العثور على الحل المثالي لاحتياجاتك العقارية'
              : 'Contact us today and we will help you find the perfect solution for your real estate needs'}
          </p>
          <a
            href={`/${locale}/contact`}
            className="inline-block bg-primary text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-primary-dark transition-all transform hover:scale-105 shadow-lg"
          >
            {locale === 'ar' ? 'اتصل بنا الآن' : 'Contact Us Now'}
          </a>
        </div>
      </section>
    </div>
  );
}
