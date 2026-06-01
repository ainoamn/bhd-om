'use client';

import Icon from '@/components/icons/Icon';
import SortSelect, { type SortOption } from '@/components/admin/SortSelect';
import { DOC_TYPE_LABELS } from '@/lib/accounting/ui/documentLabels';
import type { JournalEntry } from '@/lib/data/accounting';

export default function AccountingJournalTab(props: {
  ar: boolean;
  sortedEntries: JournalEntry[];
  sortJournal: SortOption;
  setSortJournal: (v: SortOption) => void;
  useDb: boolean;
  journalCount: number;
  journalTotal?: number;
  loadingMoreJournal: boolean;
  loadMoreJournal: () => void;
  onAddJournal: () => void;
}) {
  const {
    ar,
    sortedEntries,
    sortJournal,
    setSortJournal,
    useDb,
    journalCount,
    journalTotal,
    loadingMoreJournal,
    loadMoreJournal,
    onAddJournal,
  } = props;

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm" data-testid="accounting-tab-journal">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 bg-gray-50/50 px-6 py-4">
        <h4 className="flex items-center gap-2 font-bold text-gray-900">
          <Icon name="documentText" className="h-5 w-5 admin-accent-text" />
          {ar ? 'قيود اليومية' : 'Journal Entries'}
        </h4>
        <div className="flex flex-wrap items-center gap-4">
          <SortSelect value={sortJournal} onChange={setSortJournal} ar={ar} />
          <button
            type="button"
            className="admin-btn-primary inline-flex items-center gap-2 text-sm shadow-sm hover:shadow-md"
            onClick={onAddJournal}
          >
            <Icon name="plus" className="h-4 w-4" />
            {ar ? 'قيد يومية يدوي' : 'Add journal entry'}
          </button>
        </div>
      </div>
      {sortedEntries.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
            <Icon name="documentText" className="h-8 w-8 text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">{ar ? 'لا توجد قيود' : 'No journal entries'}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{ar ? 'التاريخ' : 'Date'}</th>
                <th>{ar ? 'رقم القيد' : 'Entry #'}</th>
                <th>{ar ? 'الوصف' : 'Description'}</th>
                <th>{ar ? 'النوع' : 'Type'}</th>
                <th>{ar ? 'المبلغ' : 'Amount'}</th>
                <th>{ar ? 'الرابط' : 'Link'}</th>
              </tr>
            </thead>
            <tbody>
              {sortedEntries.map((e) => (
                <tr key={e.id}>
                  <td>{new Date(e.date).toLocaleDateString(ar ? 'ar-OM' : 'en-GB')}</td>
                  <td className="font-mono text-sm">{e.serialNumber}</td>
                  <td>{ar ? e.descriptionAr : e.descriptionEn || e.descriptionAr || '—'}</td>
                  <td>
                    {e.documentType
                      ? ar
                        ? DOC_TYPE_LABELS[e.documentType].ar
                        : DOC_TYPE_LABELS[e.documentType].en
                      : '—'}
                  </td>
                  <td>{e.totalDebit.toLocaleString()} ر.ع</td>
                  <td className="text-xs">
                    {e.contactId && (
                      <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-800">{ar ? 'عميل' : 'Contact'}</span>
                    )}
                    {e.bankAccountId && (
                      <span className="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">{ar ? 'بنك' : 'Bank'}</span>
                    )}
                    {e.propertyId && (
                      <span className="inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-800">{ar ? 'عقار' : 'Property'}</span>
                    )}
                    {e.projectId && (
                      <span className="inline-block px-2 py-0.5 rounded bg-violet-100 text-violet-800">{ar ? 'مشروع' : 'Project'}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {useDb && (journalTotal ?? 0) > journalCount && (
        <div className="border-t border-gray-100 px-6 py-4 text-center">
          <button type="button" onClick={loadMoreJournal} disabled={loadingMoreJournal} className="admin-btn-secondary text-sm !py-2">
            {loadingMoreJournal
              ? ar
                ? 'جاري التحميل...'
                : 'Loading...'
              : ar
                ? `تحميل المزيد (${journalCount}/${journalTotal})`
                : `Load more (${journalCount}/${journalTotal})`}
          </button>
        </div>
      )}
    </div>
  );
}
