'use client';

import { useCallback, useEffect, useState } from 'react';
import Icon from '@/components/icons/Icon';
import {
  ADMIN_THEME_EVENT,
  applyAdminTheme,
  getAdminTheme,
  resolveAdminTheme,
  setAdminTheme,
  type AdminTheme,
} from '@/lib/client/adminTheme';

type Props = {
  locale: string;
  compact?: boolean;
  /** pill = زر بارز في الهيدر/الشريط؛ nav = رابط في أسفل القائمة */
  variant?: 'nav' | 'pill';
};

export default function AdminThemeToggle({ locale, compact, variant = 'nav' }: Props) {
  const ar = locale === 'ar';
  const [theme, setTheme] = useState<AdminTheme>('light');
  const [resolved, setResolved] = useState<'light' | 'dark'>('light');

  const sync = useCallback(() => {
    const next = getAdminTheme();
    setTheme(next);
    const r = resolveAdminTheme(next);
    setResolved(r);
    applyAdminTheme(next);
  }, []);

  useEffect(() => {
    sync();
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'bhd_admin_theme') sync();
    };
    const onTheme = () => sync();
    window.addEventListener('storage', onStorage);
    window.addEventListener(ADMIN_THEME_EVENT, onTheme);
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onMq = () => sync();
    mq.addEventListener('change', onMq);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(ADMIN_THEME_EVENT, onTheme);
      mq.removeEventListener('change', onMq);
    };
  }, [sync]);

  const cycle = () => {
    const order: AdminTheme[] = ['light', 'dark', 'system'];
    const idx = order.indexOf(theme);
    const next = order[(idx + 1) % order.length];
    setAdminTheme(next);
    setTheme(next);
    setResolved(resolveAdminTheme(next));
  };

  const label =
    theme === 'system'
      ? ar
        ? 'تلقائي'
        : 'Auto'
      : resolved === 'dark'
        ? ar
          ? 'داكن'
          : 'Dark'
        : ar
          ? 'فاتح'
          : 'Light';

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={cycle}
        className={`admin-theme-toggle ${compact ? 'admin-theme-toggle--compact' : ''}`}
        title={ar ? 'تبديل المظهر (فاتح / داكن / تلقائي)' : 'Toggle theme (light / dark / auto)'}
        aria-label={ar ? 'تبديل المظهر' : 'Toggle theme'}
      >
        <Icon name={resolved === 'dark' ? 'moon' : 'sun'} className="admin-theme-toggle-icon" aria-hidden />
        {!compact && <span className="admin-theme-toggle-label">{label}</span>}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={cycle}
      className={`admin-nav-link admin-nav-link--external w-full ${compact ? 'justify-center' : 'justify-start lg:justify-center'}`}
      title={ar ? 'تبديل المظهر (فاتح / داكن / تلقائي)' : 'Toggle theme (light / dark / auto)'}
      aria-label={ar ? 'تبديل المظهر' : 'Toggle theme'}
    >
      <Icon name={resolved === 'dark' ? 'moon' : 'sun'} className="admin-nav-icon" aria-hidden />
      {!compact && <span className="admin-nav-link-text">{label}</span>}
    </button>
  );
}
