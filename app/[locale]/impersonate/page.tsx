'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';

function ImpersonateInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params?.locale as string) || 'ar';
  const token = searchParams.get('t');
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const ar = locale === 'ar';

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await signIn('credentials', {
        email: '__impersonate__',
        password: token,
        callbackUrl: `/${locale}`,
        redirect: false,
      });
      if (cancelled) return;
      if (res?.ok) {
        setStatus('ok');
        window.location.href = `/${locale}/admin`;
        return;
      }
      setStatus('error');
    })();
    return () => { cancelled = true; };
  }, [token, locale]);

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <p className="text-red-600 font-medium mb-4">
            {ar ? 'الرابط منتهٍ أو غير صالح. اطلبه مرة أخرى من لوحة المدير.' : 'Link expired or invalid. Request it again from the admin panel.'}
          </p>
          <Link
            href={`/${locale}/login`}
            className="inline-block px-6 py-2.5 rounded-xl font-semibold text-white bg-[#8B6F47] hover:bg-[#6B5535]"
          >
            {ar ? 'تسجيل الدخول' : 'Login'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="animate-pulse text-[#8B6F47] font-medium">
          {ar ? 'جاري فتح الجلسة كالمستخدم...' : 'Opening session as user...'}
        </div>
      </div>
    </div>
  );
}

export default function ImpersonatePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="text-[#8B6F47] font-medium">...</div>
      </div>
    }>
      <ImpersonateInner />
    </Suspense>
  );
}
