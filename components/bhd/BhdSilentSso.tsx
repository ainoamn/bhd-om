'use client';

import {
  applyAccountIsolation,
  clearAccountRebindLock,
  isAccountRebindPending,
  isIdentityOrigin,
  productStartPath,
} from '@/lib/identity/client';
import { loadBhdIdentity } from '@/lib/identity/bhd-browser';
import { useEffect } from 'react';

export function BhdSilentSso() {
  useEffect(() => {
    const path = window.location.pathname;
    if (
      isIdentityOrigin() ||
      path.includes('/login') ||
      path.startsWith('/api/') ||
      path.startsWith('/auth/')
    ) {
      return;
    }

    if (isAccountRebindPending()) return;

    let cancelled = false;

    void loadBhdIdentity().then(async (identity) => {
      if (cancelled || !identity) return;
      try {
        const { ok, body } = await identity.me();
        if (cancelled || !ok || !body.user?.id) {
          clearAccountRebindLock();
          return;
        }

        const localResponse = await fetch('/api/auth/me', { cache: 'no-store', credentials: 'include' });
        const local = (await localResponse.json().catch(() => ({}))) as { user?: { id?: string } | null; ok?: boolean };
        if (cancelled) return;

        if (local.ok && local.user?.id && local.user.id === body.user.id) {
          clearAccountRebindLock();
          return;
        }

        if (!local.user?.id) {
          const here = `${window.location.pathname}${window.location.search || ''}` || '/';
          window.location.replace(identity.productStart(here) || productStartPath(here));
          return;
        }

        await applyAccountIsolation(body.token, { force: true });
      } catch {
        clearAccountRebindLock();
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
