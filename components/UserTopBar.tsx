'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState, useEffect, useRef, useCallback } from 'react';
import Icon from '@/components/icons/Icon';
import { useUserBar } from '@/components/UserBarContext';

const SCROLL_THRESHOLD = 80;
const AUTO_HIDE_AFTER_MS = 5000;

export default function UserTopBar() {
  const { data: session, status } = useSession();
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const t = useTranslations('userBar');
  const ar = locale === 'ar';
  const { setBarVisible } = useUserBar();
  const [visible, setVisible] = useState(false);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const scheduleHide = useCallback(() => {
    clearHideTimeout();
    hideTimeoutRef.current = setTimeout(() => {
      setVisible(false);
      setBarVisible(false);
      hideTimeoutRef.current = null;
    }, AUTO_HIDE_AFTER_MS);
  }, [clearHideTimeout, setBarVisible]);

  useEffect(() => {
    const handleScroll = () => {
      const y = typeof window !== 'undefined' ? window.scrollY : 0;
      if (y <= SCROLL_THRESHOLD) {
        setVisible(true);
        setBarVisible(true);
        scheduleHide();
      } else {
        clearHideTimeout();
        setVisible(false);
        setBarVisible(false);
      }
    };

    if (typeof window === 'undefined') return;
    const y = window.scrollY;
    if (y <= SCROLL_THRESHOLD) {
      setVisible(true);
      setBarVisible(true);
      scheduleHide();
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearHideTimeout();
    };
  }, [scheduleHide, clearHideTimeout, setBarVisible]);

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
      className={`fixed top-0 left-0 right-0 z-[100] h-11 bg-[#8B6F47] text-white flex items-center justify-between gap-4 px-4 sm:px-6 text-sm font-medium shadow-lg border-b border-[#8B6F47]/20 transition-transform duration-300 ease-out ${
        visible ? 'translate-y-0' : '-translate-y-full'
      }`}
      style={{ willChange: 'transform' }}
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
