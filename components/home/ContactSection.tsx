'use client';

import { useLocale } from 'next-intl';
import { useState } from 'react';
import { getSiteContent } from '@/lib/data/siteContent';

export default function ContactSection() {
  const locale = useLocale();
  const contactContent = getSiteContent().contact;
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
  };

  return (
    <section className="py-32 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              {locale === 'ar' ? contactContent.titleAr : contactContent.titleEn}
            </h2>
            <h3 className="text-2xl font-semibold text-gray-700 mb-4">
              {locale === 'ar' ? contactContent.subtitleAr : contactContent.subtitleEn}
            </h3>
          </div>

          <form onSubmit={handleSubmit} className="bg-gray-50 rounded-xl p-10 shadow-lg">
            <div className="space-y-8">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  {locale === 'ar' ? 'الاسم' : 'Name'} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-5 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  {locale === 'ar' ? 'البريد الإلكتروني' : 'Email'} *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-5 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  {locale === 'ar' ? 'الرسالة' : 'Message'} *
                </label>
                <textarea
                  required
                  rows={6}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-5 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-base leading-relaxed"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-primary text-white px-10 py-5 rounded-lg font-semibold text-lg hover:bg-primary-dark transition-colors shadow-lg hover:shadow-xl mt-4"
              >
                {locale === 'ar' ? 'طلب اتصال' : 'REQUEST A CALL BACK'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
