'use client';

import { useLocale } from 'next-intl';
import Link from 'next/link';

export default function SubscriptionsCTA() {
  const locale = useLocale();
  const ar = locale === 'ar';

  return (
    <section className="py-16 bg-gradient-to-br from-primary/10 to-primary/5 border-y border-primary/20">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
          {ar ? 'باقات الاشتراك' : 'Subscription Plans'}
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
          {ar
            ? 'اختر الباقة المناسبة لإدارة عقاراتك وحجوزاتك وعقودك مع مرونة كاملة.'
            : 'Choose the right plan for your property management, bookings and contracts.'}
        </p>
        <Link
          href={`/${locale}/subscriptions`}
          prefetch={true}
          className="inline-flex items-center gap-2 bg-primary text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-primary/90 transition-colors shadow-lg hover:shadow-xl"
        >
          {ar ? 'عرض الباقات' : 'View Plans'}
          <span aria-hidden>{ar ? '←' : '→'}</span>
        </Link>
      </div>
    </section>
  );
}
