'use client';

import { useState } from 'react';

export default function CallbackForm() {
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

    // Simulate form submission
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitStatus('success');
      setFormData({ name: '', phone: '' });
      
      // Reset success message after 5 seconds
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
          تم إرسال طلبك بنجاح! سنتواصل معك قريبًا.
        </div>
      )}
      
      {submitStatus === 'error' && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-sm">
          حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.
        </div>
      )}

      <div>
        <label htmlFor="callback-name" className="block text-sm font-medium text-gray-700 mb-2">
          الاسم *
        </label>
        <input
          type="text"
          id="callback-name"
          name="name"
          required
          value={formData.name}
          onChange={handleChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="أدخل اسمك"
        />
      </div>

      <div>
        <label htmlFor="callback-phone" className="block text-sm font-medium text-gray-700 mb-2">
          رقم الهاتف *
        </label>
        <input
          type="tel"
          id="callback-phone"
          name="phone"
          required
          value={formData.phone}
          onChange={handleChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="+968 XXXX XXXX"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-secondary text-white px-6 py-3 rounded-lg font-semibold hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'جاري الإرسال...' : 'طلب اتصال'}
      </button>
    </form>
  );
}
