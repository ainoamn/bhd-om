'use client';

import { useLocale } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { signIn } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { FcGoogle } from 'react-icons/fc';
import { HiOutlineMail, HiOutlineUserAdd } from 'react-icons/hi';

// أيقونة Microsoft SVG (لا تعتمد على react-icons)
const MicrosoftIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 23 23" fill="currentColor">
    <path fill="#f35325" d="M1 1h10v10H1z" />
    <path fill="#81bc06" d="M12 1h10v10H12z" />
    <path fill="#05a6f0" d="M1 12h10v10H1z" />
    <path fill="#ffba08" d="M12 12h10v10H12z" />
  </svg>
);

const loginSchema = z.object({
  emailOrUsername: z.string().min(1, 'required').min(3, 'min3'),
  password: z.string().min(1, 'required').min(6, 'min6'),
});

type LoginFormData = z.infer<typeof loginSchema>;

function LoginFormInner() {
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('login');
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { emailOrUsername: '', password: '' },
  });

  const onSubmit = async (data: LoginFormData) => {
    setFormError(null);
    const callbackUrl = searchParams.get('callbackUrl') ?? `/${locale}/admin`;

    const result = await signIn('credentials', {
      email: data.emailOrUsername.trim(),
      password: data.password,
      redirect: false,
      callbackUrl,
    });

    if (result?.error) {
      setFormError(t('errorInvalidCredentials'));
      return;
    }

    if (result?.ok) {
      router.push(callbackUrl);
      router.refresh();
      return;
    }

    setFormError(t('errorGeneric'));
  };

  const handleOAuthSignIn = (provider: 'google' | 'azure-ad') => {
    const callbackUrl = searchParams.get('callbackUrl') ?? `/${locale}/admin`;
    signIn(provider, { callbackUrl });
  };

  const errMsg = (key: string) => {
    if (key === 'required') return locale === 'ar' ? 'مطلوب' : 'Required';
    if (key === 'invalid') return locale === 'ar' ? 'بريد إلكتروني غير صالح' : 'Invalid email';
    if (key === 'min3') return locale === 'ar' ? '3 أحرف على الأقل' : 'At least 3 characters';
    if (key === 'min6') return locale === 'ar' ? '6 أحرف على الأقل' : 'At least 6 characters';
    return key;
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col lg:flex-row"
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* الجانب الأيسر - العلامة التجارية */}
      <div
        className="hidden lg:flex lg:w-[45%] xl:w-[50%] flex-col justify-between p-12 xl:p-20 relative overflow-hidden min-h-[400px]"
        style={{
          background: 'linear-gradient(165deg, #4a3a22 0%, #5a4a2e 20%, #6B5535 45%, #8B6F47 75%, #A6895F 100%)',
          boxShadow: '4px 0 40px rgba(0,0,0,0.12)',
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0L60 30L30 60L0 30z' fill='%23fff' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
          }}
        />
        <div className="relative z-10">
          <Link
            href={`/${locale}`}
            className="inline-flex items-center gap-3 text-white/95 hover:text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center border border-white/20">
              <Image src="/logo-bhd.png" alt="BHD" width={32} height={32} className="object-contain" />
            </div>
            <span className="font-bold text-xl tracking-tight">
              {locale === 'ar' ? 'بن حمود للتطوير' : 'Bin Hamood Development'}
            </span>
          </Link>
        </div>
        <div className="relative z-10 space-y-6">
          <h2 className="text-3xl xl:text-4xl 2xl:text-5xl font-extrabold text-white leading-tight max-w-md drop-shadow-lg">
            {t('welcomeBack')}
          </h2>
          <p className="text-white/90 text-lg xl:text-xl max-w-sm leading-relaxed">
            {t('welcomeDesc')}
          </p>
          <div className="flex gap-3 pt-2">
            <div className="w-24 h-1.5 rounded-full bg-white/60" />
            <div className="w-16 h-1.5 rounded-full bg-white/35" />
            <div className="w-10 h-1.5 rounded-full bg-white/20" />
          </div>
        </div>
        <div className="relative z-10 text-white/50 text-sm">
          © {new Date().getFullYear()} {locale === 'ar' ? 'بن حمود للتطوير' : 'Bin Hamood Development'}
        </div>
      </div>

      {/* الجانب الأيمن - النموذج */}
      <div
        className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-14 xl:p-20 min-h-screen"
        style={{
          background: 'linear-gradient(180deg, #fdfcfa 0%, #f8f5f0 50%, #f2ede6 100%)',
        }}
      >
        <div className="w-full max-w-[440px]">
          {/* شعار للشاشات الصغيرة */}
          <div className="lg:hidden text-center mb-10">
            <Link href={`/${locale}`} className="inline-block group">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto transition-all group-hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #8B6F47 0%, #A6895F 100%)', boxShadow: '0 8px 24px rgba(139,111,71,0.3)' }}
              >
                <Image src="/logo-bhd.png" alt="BHD" width={44} height={44} className="object-contain drop-shadow" />
              </div>
              <span className="block mt-4 font-bold text-neutral-800 text-xl">
                {locale === 'ar' ? 'بن حمود للتطوير' : 'Bin Hamood Development'}
              </span>
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl xl:text-4xl font-extrabold text-neutral-800 tracking-tight">
              {t('title')}
            </h1>
            <p className="mt-3 text-neutral-600 text-base sm:text-lg">
              {t('subtitle')}
            </p>
          </div>

          {/* أزرار التسجيل عبر Google و Microsoft */}
          <div className="space-y-3 mb-6">
            <button
              type="button"
              onClick={() => handleOAuthSignIn('google')}
              className="w-full flex items-center justify-center gap-3 py-4 px-5 rounded-xl border-2 border-neutral-300 hover:border-neutral-400 hover:bg-white bg-white/80 text-neutral-800 font-bold text-base transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.99]"
            >
              <FcGoogle className="w-6 h-6 shrink-0" />
              {t('continueWithGoogle')}
            </button>
            <button
              type="button"
              onClick={() => handleOAuthSignIn('azure-ad')}
              className="w-full flex items-center justify-center gap-3 py-4 px-5 rounded-xl border-2 border-neutral-300 hover:border-neutral-400 hover:bg-white bg-white/80 text-neutral-800 font-bold text-base transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.99]"
            >
              <MicrosoftIcon className="w-6 h-6 shrink-0" />
              {t('continueWithMicrosoft')}
            </button>
          </div>

          {/* فاصل */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t-2 border-dashed border-neutral-300" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-5 py-1 bg-inherit text-neutral-600 text-sm font-semibold rounded-full border-2 border-neutral-200 bg-white/90">
                {t('orContinueWith')}
              </span>
            </div>
          </div>

          {/* نموذج البريد وكلمة المرور */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {formError && (
              <div
                className="px-4 py-4 rounded-xl bg-red-50 border-2 border-red-200 text-red-700 text-sm font-medium flex items-center gap-3 shadow-sm"
                role="alert"
              >
                <span className="shrink-0 w-10 h-10 rounded-full bg-red-200 flex items-center justify-center text-red-700 font-bold">!</span>
                {formError}
              </div>
            )}

            <div>
              <label htmlFor="emailOrUsername" className="block text-sm font-bold text-neutral-700 mb-2">
                {t('emailOrUsername')}
              </label>
              <input
                id="emailOrUsername"
                type="text"
                autoComplete="username"
                placeholder={locale === 'ar' ? 'USR-C-2025-0001 أو البريد الإلكتروني' : 'USR-C-2025-0001 or email'}
                className={`w-full px-5 py-4 rounded-xl border-2 text-neutral-800 placeholder:text-neutral-400 text-base font-medium
                  focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all duration-200
                  ${errors.emailOrUsername ? 'border-red-500 bg-red-50/70' : 'border-neutral-300 hover:border-neutral-400'}`}
                {...register('emailOrUsername')}
              />
              {errors.emailOrUsername && (
                <p className="mt-2 text-sm font-medium text-red-600">{errMsg(errors.emailOrUsername.message ?? '')}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-sm font-bold text-neutral-700">
                  {t('password')}
                </label>
                <Link
                  href={`/${locale}/forgot-password`}
                  className="text-sm font-semibold text-primary hover:text-primary-dark transition-colors"
                >
                  {t('forgotPassword')}
                </Link>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className={`w-full px-5 py-4 rounded-xl border-2 text-neutral-800 placeholder:text-neutral-400 text-base font-medium
                  focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all duration-200
                  ${errors.password ? 'border-red-500 bg-red-50/70' : 'border-neutral-300 hover:border-neutral-400'}`}
                {...register('password')}
              />
              {errors.password && (
                <p className="mt-2 text-sm font-medium text-red-600">{errMsg(errors.password.message ?? '')}</p>
              )}
            </div>

            {/* زر تسجيل الدخول الرئيسي */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-5 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl text-lg
                transition-all duration-200 focus:ring-4 focus:ring-primary/30 focus:ring-offset-2
                disabled:opacity-60 disabled:cursor-not-allowed shadow-xl hover:shadow-2xl active:scale-[0.99]
                flex items-center justify-center gap-3 border-2 border-primary-dark/20"
              style={{ background: 'linear-gradient(135deg, #8B6F47 0%, #6B5535 100%)' }}
            >
              <HiOutlineMail className="w-6 h-6 shrink-0" />
              {isSubmitting ? t('signingIn') : t('submit')}
            </button>
          </form>

          {/* إنشاء حساب جديد */}
          <div
            className="mt-10 p-6 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5"
          >
            <p className="text-center text-neutral-700 text-base font-medium mb-4">
              {t('noAccount')}
            </p>
            <Link
              href={`/${locale}/register`}
              className="w-full flex items-center justify-center gap-3 py-4 px-5 rounded-xl border-2 border-primary text-primary hover:bg-primary hover:text-white font-bold text-base transition-all duration-200"
            >
              <HiOutlineUserAdd className="w-6 h-6 shrink-0" />
              {t('signUp')}
            </Link>
          </div>

          <Link
            href={`/${locale}`}
            className="block text-center mt-8 text-neutral-500 hover:text-primary font-semibold text-sm transition-colors"
          >
            {t('backToWebsite')}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #fdfcfa 0%, #f2ede6 100%)' }}>
        <div className="text-neutral-500 font-medium">جاري التحميل...</div>
      </div>
    }>
      <LoginFormInner />
    </Suspense>
  );
}
