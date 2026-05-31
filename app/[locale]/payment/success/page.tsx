'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';

type CompleteResponse = {
  bookingId?: string;
  propertyId?: number;
  error?: string;
  alreadyCompleted?: boolean;
};

export default function PaymentSuccessPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';
  const sessionId =
    searchParams?.get('session_id')?.trim() || searchParams?.get('sessionId')?.trim() || '';

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      setMessage(ar ? 'معرّف الجلسة غير موجود.' : 'Missing payment session id.');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/bookings/payment/complete?session_id=${encodeURIComponent(sessionId)}`,
          { credentials: 'include', cache: 'no-store' }
        );
        const data = (await res.json()) as CompleteResponse;
        if (cancelled) return;
        if (!res.ok || !data.bookingId || !data.propertyId) {
          setStatus('error');
          setMessage(
            ar
              ? 'تعذّر تأكيد الدفع. إن تم الخصم تواصل مع الدعم.'
              : 'Could not confirm payment. If you were charged, please contact support.'
          );
          return;
        }
        setStatus('success');
        setTimeout(() => {
          router.push(`/${locale}/properties/${data.propertyId}/receipt?booking=${encodeURIComponent(data.bookingId || '')}`);
        }, 1500);
      } catch {
        if (!cancelled) {
          setStatus('error');
          setMessage(ar ? 'خطأ في الاتصال.' : 'Connection error.');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId, ar, locale, router]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-4 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        {status === 'loading' && (
          <>
            <div className="text-4xl animate-pulse">⏳</div>
            <h1 className="text-xl font-bold text-gray-900">
              {ar ? 'جاري تأكيد الدفع...' : 'Confirming payment...'}
            </h1>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="text-4xl">✅</div>
            <h1 className="text-xl font-bold text-emerald-700">
              {ar ? 'تم الدفع بنجاح' : 'Payment successful'}
            </h1>
            <p className="text-gray-600 text-sm">
              {ar ? 'جاري تحويلك إلى الإيصال...' : 'Redirecting to your receipt...'}
            </p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-4xl">⚠️</div>
            <h1 className="text-xl font-bold text-red-600">
              {ar ? 'تعذّر إكمال الحجز' : 'Could not complete booking'}
            </h1>
            <p className="text-gray-600 text-sm">{message}</p>
            <Link
              href={`/${locale}/properties`}
              className="inline-block mt-4 text-[#8B6F47] font-semibold hover:underline"
            >
              {ar ? 'العودة للعقارات' : 'Back to properties'}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
