'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import Icon from '@/components/icons/Icon';

type NotificationItem = {
  id: string;
  kind: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string | null;
  bodyEn: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

const KIND_ICON: Record<string, keyof typeof import('@/lib/icons').icons> = {
  BOOKING: 'calendar',
  CONTRACT: 'archive',
  PAYMENT: 'creditCard',
  SUBSCRIPTION: 'creditCard',
  SYSTEM: 'inbox',
};

export default function NotificationsPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';
  const t = useTranslations('admin.nav');

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/me/notifications?limit=100', { credentials: 'include', cache: 'no-store' });
      if (!res.ok) {
        setItems([]);
        setUnreadCount(0);
        return;
      }
      const data = (await res.json()) as { items?: NotificationItem[]; unreadCount?: number };
      setItems(Array.isArray(data.items) ? data.items : []);
      setUnreadCount(typeof data.unreadCount === 'number' ? data.unreadCount : 0);
    } catch {
      setItems([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const markRead = async (id: string) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await fetch(`/api/me/notifications/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ read: true }),
      });
    } catch {
      void load();
    }
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await fetch('/api/me/notifications/read-all', {
        method: 'PATCH',
        credentials: 'include',
      });
      setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })));
      setUnreadCount(0);
    } finally {
      setMarkingAll(false);
    }
  };

  const fmtDate = (iso: string) =>
    iso
      ? new Date(iso).toLocaleString(ar ? 'ar-OM' : 'en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—';

  const title = t('clientNav.notifications') || (ar ? 'الإشعارات' : 'Notifications');

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={title}
        subtitle={ar ? 'الإشعارات والمستجدات الخاصة بك' : 'Your notifications and updates'}
        actions={
          unreadCount > 0 ? (
            <button
              type="button"
              className="admin-btn admin-btn--secondary text-sm"
              onClick={() => void markAllRead()}
              disabled={markingAll}
            >
              {markingAll
                ? ar
                  ? 'جاري التحديث…'
                  : 'Updating…'
                : ar
                  ? `تعليم الكل كمقروء (${unreadCount})`
                  : `Mark all read (${unreadCount})`}
            </button>
          ) : undefined
        }
      />

      {loading ? (
        <div className="admin-card p-12 text-center">
          <p className="text-gray-500">{ar ? 'جاري التحميل…' : 'Loading…'}</p>
        </div>
      ) : items.length === 0 ? (
        <div className="admin-card p-12 text-center">
          <Icon name="inbox" className="mx-auto mb-4 h-12 w-12 text-gray-300" aria-hidden />
          <p className="text-gray-500">{ar ? 'لا توجد إشعارات' : 'No notifications'}</p>
        </div>
      ) : (
        <ul className="admin-card divide-y divide-gray-100" role="list">
          {items.map((n) => {
            const isUnread = !n.readAt;
            const nTitle = ar ? n.titleAr : n.titleEn;
            const nBody = ar ? n.bodyAr : n.bodyEn;
            const icon = KIND_ICON[n.kind] || 'inbox';
            const href = n.href ? (n.href.startsWith('/') ? `/${locale}${n.href}` : n.href) : null;

            const inner = (
              <>
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    isUnread ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  <Icon name={icon} className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className={`font-medium ${isUnread ? 'text-gray-900' : 'text-gray-600'}`}>{nTitle}</p>
                    <time className="shrink-0 text-xs text-gray-400" dateTime={n.createdAt}>
                      {fmtDate(n.createdAt)}
                    </time>
                  </div>
                  {nBody && <p className="mt-1 text-sm text-gray-500 line-clamp-2">{nBody}</p>}
                  {isUnread && (
                    <span className="mt-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      {ar ? 'جديد' : 'New'}
                    </span>
                  )}
                </div>
              </>
            );

            return (
              <li key={n.id}>
                {href ? (
                  <Link
                    href={href}
                    className="flex gap-4 p-4 transition hover:bg-gray-50/80"
                    onClick={() => {
                      if (isUnread) void markRead(n.id);
                    }}
                  >
                    {inner}
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="flex w-full gap-4 p-4 text-start transition hover:bg-gray-50/80"
                    onClick={() => {
                      if (isUnread) void markRead(n.id);
                    }}
                  >
                    {inner}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
