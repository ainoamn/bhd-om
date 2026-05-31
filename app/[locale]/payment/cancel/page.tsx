'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function PaymentCancelPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-4 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="text-4xl">↩️</div>
        <h1 className="text-xl font-bold text-gray-900">
          {ar ? 'تم إلغاء الدفع' : 'Payment cancelled'}
        </h1>
        <p className="text-gray-600 text-sm">
          {ar
            ? 'لم يتم خصم المبلغ. يمكنك المحاولة مرة أخرى من صفحة الحجز.'
            : 'No charge was made. You can try again from the booking page.'}
        </p>
        <Link
          href={`/${locale}/properties`}
          className="inline-flex items-center justify-center mt-2 px-6 py-3 rounded-xl font-semibold text-white bg-[#8B6F47]"
        >
          {ar ? 'العودة للعقارات' : 'Back to properties'}
        </Link>
      </div>
    </div>
  );
}
