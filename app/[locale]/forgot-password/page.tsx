'use client';

import { useLocale } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';

export default function ForgotPasswordPage() {
  const locale = useLocale();

  return (
    <div
      className="min-h-screen flex"
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      style={{
        background: 'linear-gradient(135deg, #faf9f7 0%, #f2efe9 30%, #eae5dd 60%, #f5f1eb 100%)',
      }}
    >
      <div
        className="hidden lg:flex lg:w-[48%] flex-col justify-between p-12 xl:p-20 relative overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #5a4a2e 0%, #6B5535 25%, #8B6F47 60%, #A6895F 100%)',
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06), 4px 0 24px rgba(0,0,0,0.08)',
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0V0zm40 40h40v40H40V40z' fill='%23fff' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
          }}
        />
        <div className="relative z-10">
          <Link
            href={`/${locale}`}
            className="inline-flex items-center gap-3 text-white/95 hover:text-white transition-colors group"
          >
            <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center group-hover:bg-white/20 transition-colors">
              <Image src="/logo-bhd.png" alt="BHD" width={28} height={28} className="object-contain" />
            </div>
            <span className="font-bold text-lg">
              {locale === 'ar' ? 'بن حمود للتطوير' : 'Bin Hamood Development'}
            </span>
          </Link>
        </div>
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-3xl xl:text-4xl font-extrabold text-white leading-tight max-w-sm">
              {locale === 'ar' ? 'نسيت كلمة المرور؟' : 'Forgot your password?'}
            </h2>
            <p className="mt-4 text-white/85 text-lg max-w-md leading-relaxed">
              {locale === 'ar'
                ? 'تواصل مع مدير النظام لإعادة تعيين كلمة المرور الخاصة بك.'
                : 'Contact the system administrator to reset your password.'}
            </p>
          </div>
        </div>
        <div className="relative z-10 text-white/40 text-sm">
          © {new Date().getFullYear()} {locale === 'ar' ? 'بن حمود للتطوير' : 'Bin Hamood Development'}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-16">
        <div className="w-full max-w-[420px]">
          <div className="lg:hidden text-center mb-10">
            <Link href={`/${locale}`} className="inline-block">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <Image src="/logo-bhd.png" alt="BHD" width={40} height={40} className="object-contain opacity-90" />
              </div>
            </Link>
          </div>

          <div className="bg-white/90 backdrop-blur rounded-2xl p-8 shadow-xl border border-white/80">
            <h1 className="text-2xl font-bold text-neutral-800 mb-2">
              {locale === 'ar' ? 'استعادة كلمة المرور' : 'Password recovery'}
            </h1>
            <p className="text-neutral-500 mb-6">
              {locale === 'ar'
                ? 'لإعادة تعيين كلمة المرور، يرجى التواصل مع مسؤول النظام أو إرسال بريد إلى support@bhd-om.com'
                : 'To reset your password, please contact the system administrator or email support@bhd-om.com'}
            </p>

            <Link
              href={`/${locale}/login`}
              className="block w-full py-4 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl text-center transition-all duration-200"
            >
              {locale === 'ar' ? 'العودة لتسجيل الدخول' : 'Back to Login'}
            </Link>
          </div>

          <Link
            href={`/${locale}`}
            className="block text-center mt-6 text-neutral-500 hover:text-primary text-sm font-medium transition-colors"
          >
            {locale === 'ar' ? 'العودة للموقع' : 'Back to website'}
          </Link>
        </div>
      </div>
    </div>
  );
}
