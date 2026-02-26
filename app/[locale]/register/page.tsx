'use client';

import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';

const registerSchema = z
  .object({
    name: z.string().min(2, 'min2'),
    email: z.string().min(1, 'required').email('invalid'),
    phone: z.string().optional(),
    password: z.string().min(6, 'min6'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'passwordsMismatch',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('register');
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', phone: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setFormError(null);
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        phone: data.phone || undefined,
        password: data.password,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setFormError(
        json.error === 'Email already registered'
          ? (locale === 'ar' ? 'البريد الإلكتروني مسجّل بالفعل' : 'Email already registered')
          : json.error ?? t('errorGeneric')
      );
      return;
    }
    router.push(`/${locale}/login?registered=1`);
  };

  const errMsg = (key: string) => {
    if (key === 'min2') return locale === 'ar' ? 'حرفان على الأقل' : 'At least 2 characters';
    if (key === 'required') return locale === 'ar' ? 'مطلوب' : 'Required';
    if (key === 'invalid') return locale === 'ar' ? 'بريد غير صالح' : 'Invalid email';
    if (key === 'min6') return locale === 'ar' ? '6 أحرف على الأقل' : 'At least 6 characters';
    if (key === 'passwordsMismatch') return locale === 'ar' ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match';
    return key;
  };

  return (
    <div
      className="min-h-screen flex"
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="hidden lg:flex lg:w-[55%] flex-col justify-between p-12 xl:p-16 relative overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #6B5535 0%, #8B6F47 40%, #A6895F 100%)',
        }}
      >
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.4) 1px, transparent 0)`,
              backgroundSize: '40px 40px',
            }}
          />
        </div>
        <div className="relative z-10">
          <Link
            href={`/${locale}`}
            className="inline-flex items-center gap-2 text-white/90 hover:text-white transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
              <Image src="/logo-bhd.png" alt="BHD" width={24} height={24} className="object-contain" />
            </div>
            <span className="font-semibold">
              {locale === 'ar' ? 'بن حمود للتطوير' : 'Bin Hamood Development'}
            </span>
          </Link>
        </div>
        <div className="relative z-10 space-y-6">
          <h2 className="text-3xl xl:text-4xl font-bold text-white leading-tight max-w-md">
            {t('title')}
          </h2>
          <p className="text-white/80 text-lg max-w-sm">{t('subtitle')}</p>
        </div>
        <div className="relative z-10 text-white/50 text-sm">
          © {new Date().getFullYear()} {locale === 'ar' ? 'بن حمود للتطوير' : 'Bin Hamood Development'}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 lg:p-16">
        <div className="w-full max-w-[440px]">
          <div className="lg:hidden text-center mb-10">
            <Link href={`/${locale}`} className="inline-block">
              <Image src="/logo-bhd.png" alt="BHD" width={48} height={48} className="mx-auto object-contain opacity-90" />
              <span className="block mt-2 font-semibold text-neutral-800">
                {locale === 'ar' ? 'بن حمود للتطوير' : 'Bin Hamood Development'}
              </span>
            </Link>
          </div>

          <div className="mb-10">
            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-800 tracking-tight">{t('title')}</h1>
            <p className="mt-2 text-neutral-500">{t('subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {formError && (
              <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-3" role="alert">
                <span className="shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold">!</span>
                {formError}
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-neutral-700 mb-2">{t('name')}</label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                className={`w-full px-4 py-4 rounded-xl border-2 text-neutral-800 placeholder:text-neutral-400 text-base focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all ${
                  errors.name ? 'border-red-400 bg-red-50/50' : 'border-neutral-200 hover:border-neutral-300'
                }`}
                {...register('name')}
              />
              {errors.name && <p className="mt-1.5 text-sm text-red-600">{errMsg(errors.name.message ?? '')}</p>}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-neutral-700 mb-2">{t('email')}</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className={`w-full px-4 py-4 rounded-xl border-2 text-neutral-800 placeholder:text-neutral-400 text-base focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all ${
                  errors.email ? 'border-red-400 bg-red-50/50' : 'border-neutral-200 hover:border-neutral-300'
                }`}
                {...register('email')}
              />
              {errors.email && <p className="mt-1.5 text-sm text-red-600">{errMsg(errors.email.message ?? '')}</p>}
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-neutral-700 mb-2">{t('phone')}</label>
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                className="w-full px-4 py-4 rounded-xl border-2 border-neutral-200 hover:border-neutral-300 text-neutral-800 placeholder:text-neutral-400 text-base focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
                {...register('phone')}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-neutral-700 mb-2">{t('password')}</label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                className={`w-full px-4 py-4 rounded-xl border-2 text-neutral-800 placeholder:text-neutral-400 text-base focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all ${
                  errors.password ? 'border-red-400 bg-red-50/50' : 'border-neutral-200 hover:border-neutral-300'
                }`}
                {...register('password')}
              />
              {errors.password && <p className="mt-1.5 text-sm text-red-600">{errMsg(errors.password.message ?? '')}</p>}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-neutral-700 mb-2">{t('confirmPassword')}</label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                className={`w-full px-4 py-4 rounded-xl border-2 text-neutral-800 placeholder:text-neutral-400 text-base focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all ${
                  errors.confirmPassword ? 'border-red-400 bg-red-50/50' : 'border-neutral-200 hover:border-neutral-300'
                }`}
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && <p className="mt-1.5 text-sm text-red-600">{errMsg(errors.confirmPassword.message ?? '')}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl text-base transition-all duration-200 focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg hover:shadow-xl active:scale-[0.99]"
            >
              {isSubmitting
                ? (locale === 'ar' ? 'جاري الإنشاء...' : 'Creating...')
                : t('submit')}
            </button>
          </form>

          <p className="mt-8 text-center text-neutral-600">
            {t('hasAccount')}{' '}
            <Link href={`/${locale}/login`} className="font-semibold text-primary hover:text-primary-dark underline underline-offset-2">
              {t('signIn')}
            </Link>
          </p>

          <Link href={`/${locale}`} className="block text-center mt-6 text-neutral-500 hover:text-primary text-sm font-medium transition-colors">
            {locale === 'ar' ? 'العودة للموقع' : 'Back to website'}
          </Link>
        </div>
      </div>
    </div>
  );
}
