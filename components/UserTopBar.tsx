'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Icon from '@/components/icons/Icon';

export default function UserTopBar() {
  const { data: session, status } = useSession();
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const t = useTranslations('userBar');
  const ar = locale === 'ar';

  if (status !== 'authenticated' || !session?.user) return null;

  const user = session.user as { name?: string; serialNumber?: string; email?: string; phone?: string };
  const displayName =
    user.name?.trim() ||
    user.serialNumber ||
    user.email ||
    user.phone ||
    '—';

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[200] h-11 bg-[#8B6F47] text-white flex items-center justify-between gap-4 px-4 sm:px-6 text-sm font-medium shadow-md border-b border-[#8B6F47]/20"
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      role="banner"
      aria-label={ar ? 'شريط المستخدم' : 'User bar'}
    >
      <div className="flex items-center gap-2 sm:gap-3 overflow-hidden min-w-0">
        <Icon name="users" className="w-5 h-5 shrink-0 text-white/90" aria-hidden />
        <span className="text-white/90 shrink-0 text-xs sm:text-sm">
          {t('welcome')}
        </span>
        <span className="text-white/80 shrink-0 text-xs sm:text-sm">
          {t('usernameLabel')}:
        </span>
        <Link
          href={`/${locale}/admin`}
          className="hover:underline hover:opacity-95 transition-opacity truncate font-bold text-white min-w-0 text-[15px] sm:text-base"
          title={`${ar ? 'الذهاب إلى لوحة التحكم - ' : 'Go to dashboard - '}${displayName}`}
        >
          <span className="truncate block">{displayName}</span>
        </Link>
      </div>
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        <Link
          href={`/${locale}/admin`}
          className="hover:underline hover:opacity-95 transition-opacity font-semibold"
        >
          {ar ? 'لوحة التحكم' : 'Dashboard'}
        </Link>
        <span className="opacity-70 hidden sm:inline">|</span>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: `/${locale}` })}
          className="hover:underline hover:opacity-95 transition-opacity"
        >
          {ar ? 'تسجيل الخروج' : 'Log out'}
        </button>
      </div>
    </div>
  );
}
