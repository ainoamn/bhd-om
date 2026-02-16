'use client';

import { useLocale } from 'next-intl';
import ContactForm from './ContactForm';
import CallbackForm from './CallbackForm';
import PageHero from '../shared/PageHero';
import AdsDisplay from '../ads/AdsDisplay';
import { getSiteContent } from '@/lib/data/siteContent';

export default function ContactPage() {
  const locale = useLocale();
  const pageContent = getSiteContent().pagesContact;

  return (
    <div className="bg-white">
      <PageHero
        title={locale === 'ar' ? pageContent.heroTitleAr : pageContent.heroTitleEn}
        subtitle={locale === 'ar' ? pageContent.heroSubtitleAr : pageContent.heroSubtitleEn}
        backgroundImage={pageContent.heroImage}
      />
      <AdsDisplay position="below_header" />

      {/* Contact Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                {locale === 'ar' ? 'حدد موعدًا' : 'Schedule an Appointment'}
              </h2>
              <ContactForm />
            </div>

            {/* Callback Form & Contact Info */}
            <div className="space-y-8">
              {/* Callback Form */}
              <div className="bg-gray-50 p-8 rounded-xl">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  {locale === 'ar' ? 'طلب اتصال' : 'Request a Callback'}
                </h2>
                <CallbackForm />
              </div>

              {/* Contact Info */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  {locale === 'ar' ? 'معلومات الاتصال' : 'Contact Information'}
                </h2>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <span className="text-2xl ml-4">📍</span>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {locale === 'ar' ? 'العنوان' : 'Address'}
                      </h3>
                      <p className="text-gray-600">
                        {locale === 'ar' ? 'سلطنة عمان' : 'Sultanate of Oman'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="text-2xl ml-4">📧</span>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {locale === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                      </h3>
                      <a href="mailto:info@bhd-om.com" className="text-primary hover:underline">
                        info@bhd-om.com
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="text-2xl ml-4">📞</span>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {locale === 'ar' ? 'الهاتف' : 'Phone'}
                      </h3>
                      <a href="tel:+968" className="text-primary hover:underline">
                        +968
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="text-2xl ml-4">🕒</span>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {locale === 'ar' ? 'ساعات العمل' : 'Working Hours'}
                      </h3>
                      <p className="text-gray-600">
                        {locale === 'ar' ? 'الأحد - الخميس: 9:00 ص - 6:00 م' : 'Sunday - Thursday: 9:00 AM - 6:00 PM'}
                      </p>
                      <p className="text-gray-600">
                        {locale === 'ar' ? 'الجمعة - السبت: مغلق' : 'Friday - Saturday: Closed'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
