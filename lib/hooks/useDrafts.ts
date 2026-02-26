'use client';

import { useState, useEffect } from 'react';
import { hasDrafts, getDraftKeys } from '@/lib/utils/draftStorage';

const DRAFT_CHANGE_EVENT = 'bhd-draft-change';

/** الاشتراك في تغييرات المسودات للبانر */
export function useDrafts(): { hasDrafts: boolean; draftCount: number } {
  const [draftKeys, setDraftKeys] = useState<string[]>(() =>
    typeof window !== 'undefined' ? getDraftKeys() : []
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => setDraftKeys(getDraftKeys());
    handler();
    window.addEventListener(DRAFT_CHANGE_EVENT, handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener(DRAFT_CHANGE_EVENT, handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  return { hasDrafts: draftKeys.length > 0, draftCount: draftKeys.length };
}
