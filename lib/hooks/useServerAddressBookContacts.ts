'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Contact } from '@/lib/data/addressBook';
import { persistAddressBookContactsLocally } from '@/lib/data/addressBook';
import { fetchAddressBookListFromServer } from '@/lib/client/addressBookServerApi';
import { ADDRESS_BOOK_UPDATED_EVENT } from '@/lib/utils/addressBookEvents';

export function filterContactsForSearch(list: Contact[], query: string): Contact[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter((c) => {
    const hay = [
      c.firstName,
      c.secondName,
      c.thirdName,
      c.familyName,
      c.name,
      c.nameEn,
      c.phone,
      c.phoneSecondary,
      c.email,
      c.civilId,
      c.passportNumber,
      c.company,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  });
}

/**
 * قائمة دفتر العناوين من GET /api/address-book — للقوائم المنسدلة (حجوزات، عقود، محاسبة…).
 * يحدّث localStorage للدوال المساعدة (getContactById) دون إطلاق حدث مزامنة.
 */
export function useServerAddressBookContacts(opts?: {
  enabled?: boolean;
  includeArchived?: boolean;
  limit?: number;
  listenForUpdates?: boolean;
}) {
  const enabled = opts?.enabled !== false;
  const includeArchived = opts?.includeArchived ?? false;
  const limit = opts?.limit ?? 500;
  const listenForUpdates = opts?.listenForUpdates !== false;

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setContacts([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await fetchAddressBookListFromServer(limit);
      persistAddressBookContactsLocally(list);
      setContacts(includeArchived ? list : list.filter((c) => !c.archived));
    } catch {
      setError('network');
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }, [enabled, includeArchived, limit]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled || !listenForUpdates) return;
    const onUpdate = () => {
      void refresh();
    };
    window.addEventListener(ADDRESS_BOOK_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(ADDRESS_BOOK_UPDATED_EVENT, onUpdate);
  }, [enabled, listenForUpdates, refresh]);

  return { contacts, loading, error, refresh };
}
