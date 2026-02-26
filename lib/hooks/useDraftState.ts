'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { saveDraft, loadDraft, clearDraft } from '@/lib/utils/draftStorage';

const DEBOUNCE_MS = 800;

/**
 * حالة مع حفظ تلقائي كمسودة - سلوك عام للموقع
 * البيانات تُحفظ تلقائياً ولا تُطبق إلا بعد النقر على "حفظ"
 */
export function useDraftState<T>(
  draftKey: string,
  initialData: T,
  options?: { debounceMs?: number; serialize?: (v: T) => T }
): [T, (v: T | ((prev: T) => T)) => void, () => void] {
  const [state, setStateInternal] = useState<T>(() => {
    if (typeof window === 'undefined') return initialData;
    const loaded = loadDraft<T>(draftKey);
    if (loaded != null && typeof loaded === 'object') {
      return { ...initialData, ...loaded } as T;
    }
    return initialData;
  });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceMs = options?.debounceMs ?? DEBOUNCE_MS;

  const setState = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStateInternal((prev) => {
        const next = typeof value === 'function' ? (value as (p: T) => T)(prev) : value;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          try {
            const toSave = options?.serialize ? options.serialize(next) : next;
            saveDraft(draftKey, toSave);
          } catch {}
          debounceRef.current = null;
        }, debounceMs);
        return next;
      });
    },
    [draftKey, debounceMs, options?.serialize]
  );

  const clearDraftForCommit = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    clearDraft(draftKey);
  }, [draftKey]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return [state, setState, clearDraftForCommit];
}
