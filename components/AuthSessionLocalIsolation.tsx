'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { clearOperationalClientDataForNewAuthUser } from '@/lib/data/backup';
import { clearAddressBookLocalStorage } from '@/lib/data/addressBook';

const LAST_AUTH_KEY = 'bhd_last_auth_user_v1';

function normalizeEmail(v?: string | null): string {
  return (v || '').trim().toLowerCase();
}

function buildIdentity(user: unknown): string {
  const u = user as { id?: string; email?: string | null };
  const id = (u?.id || '').trim();
  const email = normalizeEmail(u?.email || '');
  // نفضّل id إن وُجد، وإلا البريد (يدعم جلسات قديمة/خاصة)
  return id || email || '';
}

/**
 * يمنع "تسريب" بيانات localStorage بين المستخدمين على نفس المتصفح.
 * عند تغيّر المستخدم authenticated: نمسح البيانات التشغيلية المحلية (حجوزات/عقود/مستندات…).
 */
export default function AuthSessionLocalIsolation() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (status !== 'authenticated') return;
    const identity = buildIdentity(session?.user);
    if (!identity) return;

    let prev = '';
    try {
      prev = String(localStorage.getItem(LAST_AUTH_KEY) || '');
    } catch {}

    if (prev && prev !== identity) {
      // مستخدم جديد على نفس المتصفح:
      // - امسح التشغيلية المحلية حتى لا تظهر حجوزات قديمة مرتبطة بالبريد/الهاتف
      // - امسح دفتر العناوين المحلي حتى لا تظهر بيانات "حسابي" القديمة (CNT-*) لمستخدم آخر
      clearOperationalClientDataForNewAuthUser();
      clearAddressBookLocalStorage();
    }

    try {
      localStorage.setItem(LAST_AUTH_KEY, identity);
    } catch {}
  }, [session?.user, status]);

  return null;
}

