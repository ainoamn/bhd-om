'use client';

import { type BhdApp } from '@/lib/bhd/apps';
import {
  applyCatalogPayload,
  BHD_CATALOG_EVENT,
  fetchIdentityCatalog,
  getCachedCatalogApps,
} from '@/lib/bhd/catalog';
import { loadBhdIdentity } from '@/lib/identity/bhd-browser';
import { useEffect, useState } from 'react';

export function useBhdCatalog() {
  const [apps, setApps] = useState<BhdApp[]>(() => getCachedCatalogApps());

  useEffect(() => {
    let cancelled = false;

    const apply = (payload: unknown) => {
      const next = applyCatalogPayload(payload);
      if (!next.length || cancelled) return;
      setApps(next);
    };

    function onCatalog(event: Event) {
      apply((event as CustomEvent).detail);
    }

    window.addEventListener(BHD_CATALOG_EVENT, onCatalog);

    void (async () => {
      const identity = await loadBhdIdentity(2000);
      if (cancelled) return;
      if (identity?.catalog) {
        try {
          apply(await identity.catalog());
          return;
        } catch {
          /* fall through */
        }
      }
      const apps = await fetchIdentityCatalog();
      if (!cancelled) setApps(apps);
    })();

    return () => {
      cancelled = true;
      window.removeEventListener(BHD_CATALOG_EVENT, onCatalog);
    };
  }, []);

  return apps;
}
