'use client';

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import PageHero from '@/components/shared/PageHero';
import { createBooking } from '@/lib/data/bookings';
import { getPropertyById, getPropertyDataOverrides } from '@/lib/data/properties';

export default function PropertyViewingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params?.id as string;
  const unitKey = searchParams?.get('unit') ?? undefined;
  const locale = (params?.locale as string) || 'ar';

  const dataOverrides = getPropertyDataOverrides();
  const property = getPropertyById(id, dataOverrides);
  const isUnit = !!unitKey;

  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const ar = locale === 'ar';
  const displayTitle = property
    ? isUnit && unitKey
      ? (() => {
          const [unitType, idx] = unitKey.split('-');
          const i = parseInt(idx, 10);
          const labels: Record<string, [string, string]> = { shop: ['محل', 'Shop'], showroom: ['معرض', 'Showroom'], apartment: ['شقة', 'Apartment'] };
          const [arL, enL] = labels[unitType] || ['', ''];
          return ar ? `${property.titleAr} - ${arL} ${i + 1}` : `${property.titleEn} - ${enL} ${i + 1}`;
        })()
      : ar ? property.titleAr : property.titleEn
    : '';

  const propertyTitleAr = property ? (isUnit && unitKey ? (() => { const [unitType, idx] = unitKey!.split('-'); const i = parseInt(idx, 10); const labels: Record<string, string> = { shop: 'محل', showroom: 'معرض', apartment: 'شقة' }; return `${property.titleAr} - ${labels[unitType] || ''} ${i + 1}`; })() : property.titleAr) : '';
  const propertyTitleEn = property ? (isUnit && unitKey ? (() => { const [unitType, idx] = unitKey!.split('-'); const i = parseInt(idx, 10); const labels: Record<string, string> = { shop: 'Shop', showroom: 'Showroom', apartment: 'Apartment' }; return `${property.titleEn} - ${labels[unitType] || ''} ${i + 1}`; })() : property.titleEn) : '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!property) return;
    setIsSubmitting(true);
    setSubmitStatus('idle');
    try {
      createBooking({
        propertyId: property.id,
        unitKey,
        propertyTitleAr,
        propertyTitleEn,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        message: formData.message || undefined,
        type: 'VIEWING',
      });
      setSubmitStatus('success');
      setFormData({ name: '', email: '', phone: '', message: '' });
      setTimeout(() => router.push(`/${locale}/properties/${id}${unitKey ? `?unit=${unitKey}` : ''}`), 2500);
    } catch {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <p className="text-gray-600 mb-4">{ar ? 'العقار غير موجود' : 'Property not found'}</p>
          <Link href={`/${locale}/properties`} className="text-primary font-semibold hover:underline">
            {ar ? 'العودة للعقارات' : 'Back to Properties'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHero title={ar ? 'طلب معاينة' : 'Schedule Viewing'} subtitle={displayTitle} compact />
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-xl">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {ar ? 'طلب معاينة العقار' : 'Property Viewing Request'}
            </h2>
            <p className="text-gray-600 mb-6">
              {ar ? 'أكمل البيانات أدناه لطلب معاينة العقار. ستقوم إدارة العقار بتحديد موعد المعاينة والتواصل معك.' : 'Complete the form below to request a property viewing. Property management will schedule the viewing and contact you.'}
            </p>

            {submitStatus === 'success' && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6">
                {ar ? 'تم إرسال طلب المعاينة بنجاح! سنتواصل معك لتحديد الموعد.' : 'Viewing request submitted successfully! We will contact you to schedule.'}
              </div>
            )}
            {submitStatus === 'error' && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
                {ar ? 'حدث خطأ. يرجى المحاولة مرة أخرى.' : 'An error occurred. Please try again.'}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{ar ? 'الاسم *' : 'Name *'}</label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary" placeholder={ar ? 'أدخل اسمك' : 'Enter your name'} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{ar ? 'البريد الإلكتروني *' : 'Email *'}</label>
                <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary" placeholder="example@email.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{ar ? 'الهاتف *' : 'Phone *'}</label>
                <input type="tel" required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary" placeholder="+968 XXXX XXXX" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{ar ? 'ملاحظات أو أوقات مناسبة' : 'Notes or preferred times'}</label>
                <textarea value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} rows={4} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary" placeholder={ar ? 'أي أوقات أو أيام تفضلها للمعاينة...' : 'Any preferred times or days for viewing...'} />
              </div>
              <div className="flex gap-4">
                <button type="submit" disabled={isSubmitting} className="flex-1 bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary-dark disabled:opacity-50">
                  {isSubmitting ? (ar ? 'جاري الإرسال...' : 'Submitting...') : (ar ? 'إرسال طلب المعاينة' : 'Submit Viewing Request')}
                </button>
                <Link href={`/${locale}/properties/${id}${unitKey ? `?unit=${unitKey}` : ''}`} className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50">
                  {ar ? 'إلغاء' : 'Cancel'}
                </Link>
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
