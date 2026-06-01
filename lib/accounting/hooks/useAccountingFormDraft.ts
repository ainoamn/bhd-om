import { useEffect, useRef } from 'react';
import { clearDraft, loadDraft, saveDraft } from '@/lib/utils/draftStorage';

/**
 * Auto-save form state as draft while modal is open; restore on first open.
 */
export function useAccountingFormDraft<T>(
  draftKey: string,
  open: boolean,
  form: T,
  setForm: (value: T | ((prev: T) => T)) => void
) {
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      const draft = loadDraft<T>(draftKey);
      if (draft) setForm(draft);
    }
    wasOpenRef.current = open;
  }, [open, draftKey, setForm]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => saveDraft(draftKey, form), 800);
    return () => clearTimeout(timer);
  }, [open, draftKey, form]);

  return { clearFormDraft: () => clearDraft(draftKey) };
}
