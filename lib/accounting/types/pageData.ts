import type { ChartAccount, JournalEntry, AccountingDocument } from '@/lib/data/accounting';

/** SSR bootstrap payload for /admin/accounting */
export type AccountingInitialData = {
  accounts?: ChartAccount[];
  documents?: AccountingDocument[];
  journalEntries?: JournalEntry[];
  periods?: Array<{ id: string; code: string; startDate: string; endDate: string; isLocked: boolean }>;
  meta?: {
    documentsTotal?: number;
    journalTotal?: number;
    documentsTruncated?: boolean;
    journalTruncated?: boolean;
  };
};
