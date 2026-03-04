'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useLocale } from 'next-intl';

/** صفحة تمثيل المستخدم — تفتح في نافذة جديدة وتُسجّل الدخول تلقائياً كمستخدم */
export default function ImpersonatePage() {
  const searchParams = useSearchParams();
  const locale = useLocale();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMsg(locale === 'ar' ? 'رابط غير صالح' : 'Invalid link');
      return;
    }
    (async () => {
      const result = await signIn('credentials', {
        email: '__impersonate__',
        password: token,
        redirect: false,
        callbackUrl: `/${locale}`,
      });
      if (result?.ok) {
        setStatus('success');
        // التوجيه حسب دور المستخدم — عميل/مالك يرى لوحته
        window.location.href = `/${locale}/admin`;
      } else {
        setStatus('error');
        setMsg(locale === 'ar' ? 'انتهت صلاحية الرابط أو غير صالح' : 'Link expired or invalid');
      }
    })();
  }, [searchParams, locale]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-2 border-[#8B6F47] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">{locale === 'ar' ? 'جاري تسجيل الدخول...' : 'Signing in...'}</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center text-3xl mx-auto mb-4">⚠️</div>
          <p className="text-gray-700 font-medium">{msg}</p>
          <button
            type="button"
            onClick={() => window.close()}
            className="mt-4 px-6 py-2.5 rounded-xl font-semibold text-white bg-[#8B6F47] hover:bg-[#6B5535]"
          >
            {locale === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
