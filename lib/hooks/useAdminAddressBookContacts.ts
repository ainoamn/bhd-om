'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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

/**
 * جلب دفتر العناوين من الخادم فقط (طلب HTTP واحد لكل دورة).
 * للمدير: مصدر العرض = استجابة GET /api/address-book (مع هوية User من الخادم)، ثم تحديث التخزين المحلي للدوال المساعدة دون إطلاق حدث مزامنة.
 * للعميل/المالك: دمج مع المحلي للصفوف غير المرفوعة بعد.
 */
export function useAdminAddressBookContacts(opts: {
  sessionStatus: 'loading' | 'authenticated' | 'unauthenticated';
  userRole: string | undefined;
  showArchived: boolean;
}) {
  const { sessionStatus, userRole, showArchived } = opts;
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

    const myId = ++requestIdRef.current;
    const ac = new AbortController();

    if (!initialFetchCompletedRef.current) {
      setLoading(true);
    }
    setError(null);

    (async () => {
      try {
        const res = await fetch(`/api/address-book?_=${Date.now()}`, {
          credentials: 'include',
          cache: 'no-store',
          signal: ac.signal,
        });

        if (!res.ok) {
          if (myId !== requestIdRef.current) return;
          if (isAdminLike(userRole) || userRole === undefined) {
            setContacts([]);
            setError(res.status === 401 ? 'unauthorized' : 'fetch_failed');
          } else {
            try {
              const all = getAllContacts(showArchived);
              const dashboardType = dashboardTypeForAddressBookFilter(userRole);
              const filtered = dashboardType ? filterContactsByRolePermissions(all, dashboardType) : all;
              setContacts(filtered);
            } catch {
              setContacts([]);
            }
            setError('fetch_failed');
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
        setError('network');
        if (!initialFetchCompletedRef.current) {
          setContacts([]);
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
  }, [sessionStatus, userRole, showArchived, refreshKey]);

  return { contacts, setContacts, loading, error, refresh };
}
