'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSession } from 'next-auth/react';
import type { Contact } from '@/lib/data/addressBook';
import {
  getAllContacts,
  mergeAddressBookApiWithLocal,
  persistAddressBookContactsLocally,
} from '@/lib/data/addressBook';
import { filterContactsByRolePermissions } from '@/lib/data/contactCategoryPermissions';
import { ROLE_TO_DASHBOARD_TYPE } from '@/lib/config/dashboardRoles';

function dashboardTypeForAddressBookFilter(role: string | undefined) {
  if (role === 'CLIENT') return ROLE_TO_DASHBOARD_TYPE.CLIENT;
  if (role === 'OWNER') return ROLE_TO_DASHBOARD_TYPE.OWNER;
  return undefined;
}

function isAdminLike(role: string | undefined): boolean {
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}

/** عرض جهات من التخزين المحلي عند تعذّر الخادم (للمدير أو عند غياب الدور بعد التحميل). */
function contactsFromLocalForDisplay(
  userRole: string | undefined,
  showArchived: boolean
): Contact[] {
  try {
    const all = getAllContacts(showArchived);
    const dashboardType = dashboardTypeForAddressBookFilter(userRole);
    const base = showArchived ? all : all.filter((c) => !c.archived);
    return dashboardType ? filterContactsByRolePermissions(base, dashboardType) : base;
  } catch {
    return [];
  }
}

/**
 * جلب دفتر العناوين من الخادم فقط (طلب HTTP واحد لكل دورة).
 * للمدير: مصدر العرض = استجابة GET /api/address-book (مع هوية User من الخادم)، ثم تحديث التخزين المحلي للدوال المساعدة دون إطلاق حدث مزامنة.
 * للعميل/المالك: دمج مع المحلي للصفوف غير المرفوعة بعد.
 */
export function useAdminAddressBookContacts(opts: {
  sessionStatus: 'loading' | 'authenticated' | 'unauthenticated';
  /** عندما تكون الجلسة authenticated لكن كائن session لم يُملأ بعد — لا نجلب حتى لا يُرفَض الطلب (401) */
  sessionReady: boolean;
  userRole: string | undefined;
  showArchived: boolean;
}) {
  const { sessionStatus, sessionReady, userRole, showArchived } = opts;
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const requestIdRef = useRef(0);
  /** بعد أول اكتمال جلب ناجح (حتى لو القائمة فارغة): لا نُعيد هيكل التحميل الكامل */
  const initialFetchCompletedRef = useRef(false);

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      initialFetchCompletedRef.current = false;
      setContacts([]);
      setError(null);
      setLoading(false);
      return;
    }

    if (sessionStatus !== 'authenticated') {
      return;
    }

    if (!sessionReady) {
      return;
    }

    const myId = ++requestIdRef.current;
    const ac = new AbortController();

    if (!initialFetchCompletedRef.current) {
      setLoading(true);
    }
    setError(null);

    (async () => {
      try {
        /** يزامن كوكي الجلسة مع الخادم قبل أول طلب API — يقلّل 401 بعد تسجيل الدخول مباشرة */
        try {
          await getSession();
        } catch {
          /* ignore */
        }

        const fetchOnce = () =>
          fetch(`/api/address-book?_=${Date.now()}`, {
            credentials: 'include',
            cache: 'no-store',
            signal: ac.signal,
          });

        const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
        const is5xx = (s: number) => s === 500 || s === 502 || s === 503 || s === 504;

        let res = await fetchOnce();
        if (res.status === 401) {
          await delay(400);
          res = await fetchOnce();
        }
        if (res.status === 401) {
          await delay(700);
          res = await fetchOnce();
        }
        /** عدة محاولات عند 5xx — بردّ بارد، قاعدة غير جاهزة، مهلات Neon/Vercel */
        let fivexxAttempts = 0;
        const max5xxAttempts = 5;
        while (fivexxAttempts < max5xxAttempts && is5xx(res.status)) {
          await delay(450 + fivexxAttempts * 550);
          res = await fetchOnce();
          fivexxAttempts += 1;
        }

        if (!res.ok) {
          if (myId !== requestIdRef.current) return;
          let serverDbUnavailable = false;
          try {
            const errJson = (await res.clone().json()) as { error?: string };
            if (errJson?.error === 'database_unavailable') serverDbUnavailable = true;
          } catch {
            /* ليست JSON */
          }
          if (isAdminLike(userRole) || userRole === undefined) {
            const local = contactsFromLocalForDisplay(userRole, showArchived);
            setContacts(local);
            if (res.status === 401) {
              setError(local.length > 0 ? 'unauthorized_local' : 'unauthorized');
            } else if (serverDbUnavailable) {
              setError(local.length > 0 ? 'fetch_failed_db_local' : 'fetch_failed_db');
            } else {
              setError(local.length > 0 ? 'fetch_failed_local' : 'fetch_failed');
            }
          } else {
            try {
              const all = getAllContacts(showArchived);
              const dashboardType = dashboardTypeForAddressBookFilter(userRole);
              const filtered = dashboardType ? filterContactsByRolePermissions(all, dashboardType) : all;
              setContacts(filtered);
            } catch {
              setContacts([]);
            }
            setError(serverDbUnavailable ? 'fetch_failed_db' : 'fetch_failed');
          }
          initialFetchCompletedRef.current = true;
          return;
        }

        const raw = await res.json();
        let listFromApi: Contact[] = Array.isArray(raw) ? (raw as Contact[]) : [];

        let toDisplay: Contact[];

        if (isAdminLike(userRole) || userRole === undefined) {
          toDisplay = listFromApi;
          persistAddressBookContactsLocally(listFromApi);
        } else {
          const localContacts = getAllContacts(true);
          const merged = mergeAddressBookApiWithLocal(listFromApi, localContacts);
          persistAddressBookContactsLocally(merged);
          toDisplay = merged;
        }

        const base = showArchived ? toDisplay : toDisplay.filter((c) => !c.archived);
        const dashboardType = dashboardTypeForAddressBookFilter(userRole);
        const filtered = dashboardType ? filterContactsByRolePermissions(base, dashboardType) : base;

        if (myId !== requestIdRef.current) return;
        setContacts(filtered);
        initialFetchCompletedRef.current = true;
        setError(null);
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        if (myId !== requestIdRef.current) return;
        if (isAdminLike(userRole) || userRole === undefined) {
          const local = contactsFromLocalForDisplay(userRole, showArchived);
          setContacts(local);
          setError(local.length > 0 ? 'network_local' : 'network');
        } else {
          setError('network');
          if (!initialFetchCompletedRef.current) {
            setContacts([]);
          }
        }
        initialFetchCompletedRef.current = true;
      } finally {
        if (myId === requestIdRef.current) {
          setLoading(false);
        }
      }
    })();

    return () => {
      ac.abort();
    };
  }, [sessionStatus, sessionReady, userRole, showArchived, refreshKey]);

  return { contacts, setContacts, loading, error, refresh };
}
