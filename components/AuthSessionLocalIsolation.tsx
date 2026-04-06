'use client';

import { useEffect, useRef } from 'react';
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

function clearStaleImpersonationArtifacts(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('userSession');
    localStorage.removeItem('isSwitchingUser');
  } catch {}
  try {
    delete (window as unknown as Record<string, unknown>).currentUser;
    delete (window as unknown as Record<string, unknown>).isLoginAsUser;
    delete (window as unknown as Record<string, unknown>).originalAdminId;
    delete (window as unknown as Record<string, unknown>).mockNextAuthSession;
  } catch {}
}

/**
 * يمنع "تسريب" بيانات localStorage بين المستخدمين على نفس المتصفح.
 * عند تغيّر المستخدم authenticated: نمسح البيانات التشغيلية المحلية (حجوزات/عقود/مستندات…).
 */
export default function AuthSessionLocalIsolation() {
  const { data: session, status } = useSession();
  const prevAuthStatusRef = useRef<string | null>(null);

  /** عند تسجيل الخروج فقط (وليس عند زيارة الموقع كزائر): مسح نسخة دفتر العناوين المحلية القديمة */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prev = prevAuthStatusRef.current;
    prevAuthStatusRef.current = status;
    if (prev === 'authenticated' && status === 'unauthenticated') {
      try {
        clearAddressBookLocalStorage();
      } catch {}
    }
  }, [status]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (status !== 'authenticated') return;
    const identity = buildIdentity(session?.user);
    if (!identity) return;

    // إذا بقيت userSession من "فتح حساب" لكنها لا تطابق المستخدم الحقيقي الحالي
    // فإنها قد تفرض هوية قديمة في الواجهة. نمسحها فوراً.
    try {
      const raw = localStorage.getItem('userSession');
      if (raw) {
        const p = JSON.parse(raw) as { loginAsUser?: boolean; id?: string; email?: string };
        const hintedIdentity = (p.id || '').trim() || normalizeEmail(p.email || '');
        if (p.loginAsUser && hintedIdentity && hintedIdentity !== identity) {
          clearStaleImpersonationArtifacts();
        }
      }
    } catch {}

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

