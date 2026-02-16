'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';

export default function CallbackForm() {
  const locale = useLocale();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitStatus('success');
      setFormData({ name: '', phone: '' });
      
      setTimeout(() => setSubmitStatus('idle'), 5000);
    }, 1000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {submitStatus === 'success' && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg text-sm">
          {locale === 'ar' ? 'تم إرسال طلبك بنجاح! سنتواصل معك قريبًا.' : 'Your request has been sent successfully! We will contact you soon.'}
        </div>
      )}
      
      {submitStatus === 'error' && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-sm">
          {locale === 'ar' ? 'حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.' : 'An error occurred while sending the request. Please try again.'}
        </div>
      )}

      <div>
        <label htmlFor="callback-name" className="block text-sm font-medium text-gray-700 mb-2">
          {locale === 'ar' ? 'الاسم *' : 'Name *'}
        </label>
        <input
          type="text"
          id="callback-name"
          name="name"
          required
          value={formData.name}
          onChange={handleChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder={locale === 'ar' ? 'أدخل اسمك' : 'Enter your name'}
        />
      </div>

      <div>
        <label htmlFor="callback-phone" className="block text-sm font-medium text-gray-700 mb-2">
          {locale === 'ar' ? 'رقم الهاتف *' : 'Phone Number *'}
        </label>
        <input
          type="tel"
          id="callback-phone"
          name="phone"
          required
          value={formData.phone}
          onChange={handleChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder={locale === 'ar' ? '+968 XXXX XXXX' : '+968 XXXX XXXX'}
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-secondary text-white px-6 py-3 rounded-lg font-semibold hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting 
          ? (locale === 'ar' ? 'جاري الإرسال...' : 'Sending...')
          : (locale === 'ar' ? 'طلب اتصال' : 'Request Callback')
        }
      </button>
    </form>
  );
}
