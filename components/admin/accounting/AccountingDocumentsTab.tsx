'use client';

import SortSelect, { type SortOption } from '@/components/admin/SortSelect';
import AccountingFilter from '@/components/admin/AccountingFilter';
import { getContactDisplayFull, type Contact } from '@/lib/data/addressBook';
import { getAllBankAccounts, getBankAccountDisplay, type BankAccount } from '@/lib/data/bankAccounts';
import { getPropertyById, type Property } from '@/lib/data/properties';
import type { AccountingDocument, DocumentType } from '@/lib/data/accounting';
import { DOC_TYPE_LABELS } from '@/lib/accounting/ui/documentLabels';

export default function AccountingDocumentsTab(props: {
  ar: boolean;
  locale: string;
  contacts: Contact[];
  bankAccounts: BankAccount[];
  sortedDocs: AccountingDocument[];
  searchQuery: string;
  filterDocType: DocumentType | '';
  filterFromDate: string;
  filterToDate: string;
  filterContactId: string;
  setSearchQuery: (v: string) => void;
  setFilterDocType: (v: DocumentType | '') => void;
  setFilterFromDate: (v: string) => void;
  setFilterToDate: (v: string) => void;
  setFilterContactId: (v: string) => void;
  sortDocuments: SortOption;
  setSortDocuments: (v: SortOption) => void;
  useDb: boolean;
  documentsCount: number;
  documentsTotal?: number;
  loadingMoreDocs: boolean;
  loadMoreDocuments: () => void;
  setPrintDocument: (d: AccountingDocument) => void;
  onAddDocument: () => void;
  getPropertyDisplay: (p: Property) => string;
}) {
  const {
    ar,
    locale,
    contacts,
    bankAccounts,
    sortedDocs,
    searchQuery,
    filterDocType,
    filterFromDate,
    filterToDate,
    filterContactId,
    setSearchQuery,
    setFilterDocType,
    setFilterFromDate,
    setFilterToDate,
    setFilterContactId,
    sortDocuments,
    setSortDocuments,
    useDb,
    documentsCount,
    documentsTotal,
    loadingMoreDocs,
    loadMoreDocuments,
    setPrintDocument,
    onAddDocument,
    getPropertyDisplay,
  } = props;

  const banks = bankAccounts.length > 0 ? bankAccounts : getAllBankAccounts();

  return (
    <div className="space-y-4">
      <AccountingFilter
        fields={[
          { key: 'search', labelAr: 'بحث', labelEn: 'Search', type: 'text', placeholderAr: 'رقم، وصف...', placeholderEn: 'Number, description...' },
          { key: 'type', labelAr: 'نوع المستند', labelEn: 'Document type', type: 'select', options: Object.entries(DOC_TYPE_LABELS).map(([k, v]) => ({ value: k, labelAr: v.ar, labelEn: v.en })) },
          { key: 'date', labelAr: 'الفترة', labelEn: 'Period', type: 'daterange' },
          { key: 'contact', labelAr: 'العميل/المورد', labelEn: 'Contact', type: 'select', options: contacts.slice(0, 50).map((c) => ({ value: c.id, labelAr: `${c.firstName} ${c.familyName}`, labelEn: c.nameEn || `${c.firstName} ${c.familyName}` })) },
        ]}
        values={{
          search: searchQuery,
          type: filterDocType,
          dateFrom: filterFromDate,
          dateTo: filterToDate,
          contact: filterContactId,
        }}
        onChange={(k, v) => {
          if (k === 'search') setSearchQuery(v);
          else if (k === 'type') setFilterDocType(v as DocumentType | '');
          else if (k === 'dateFrom') setFilterFromDate(v);
          else if (k === 'dateTo') setFilterToDate(v);
          else if (k === 'contact') setFilterContactId(v);
        }}
        onReset={() => {
          setSearchQuery('');
          setFilterDocType('');
          setFilterFromDate('');
          setFilterToDate('');
          setFilterContactId('');
        }}
        ar={ar}
        resultCount={sortedDocs.length}
      />
      <div className="admin-card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
          <h4 className="font-bold text-gray-900">{ar ? 'الفواتير والإيصالات وعروض الأسعار' : 'Invoices, Receipts & Quotes'}</h4>
          <SortSelect value={sortDocuments} onChange={setSortDocuments} ar={ar} />
          <button type="button" className="text-sm font-semibold admin-accent-text hover:underline" onClick={onAddDocument}>
            {ar ? '➕ إضافة مستند' : '➕ Add document'}
          </button>
        </div>
        {sortedDocs.length === 0 ? (
          <div className="p-16 text-center">
            <p className="text-gray-500 font-medium">{ar ? 'لا توجد مستندات' : 'No documents'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{ar ? 'التاريخ' : 'Date'}</th>
                  <th>{ar ? 'الرقم' : 'Number'}</th>
                  <th>{ar ? 'النوع' : 'Type'}</th>
                  <th>{ar ? 'العميل' : 'Contact'}</th>
                  <th>{ar ? 'الحساب البنكي' : 'Bank'}</th>
                  <th>{ar ? 'العقار' : 'Property'}</th>
                  <th>{ar ? 'المبلغ' : 'Amount'}</th>
                  <th>{ar ? 'الحالة' : 'Status'}</th>
                  <th>{ar ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {sortedDocs.map((d) => (
                  <tr key={d.id}>
                    <td>{new Date(d.date).toLocaleDateString(ar ? 'ar-OM' : 'en-GB')}</td>
                    <td className="font-mono text-sm">{d.serialNumber}</td>
                    <td>{ar ? DOC_TYPE_LABELS[d.type].ar : DOC_TYPE_LABELS[d.type].en}</td>
                    <td>
                      {d.contactId ? getContactDisplayFull(contacts.find((c) => c.id === d.contactId)!, locale) : '—'}
                    </td>
                    <td className="text-sm">
                      {d.bankAccountId ? (() => { const b = banks.find((x) => x.id === d.bankAccountId); return b ? getBankAccountDisplay(b) : d.bankAccountId; })() : (ar ? 'صندوق' : 'Cash')}
                    </td>
                    <td className="text-sm align-top">
                      {d.propertyId ? (() => {
                        const p = getPropertyById(d.propertyId);
                        return p ? <span className="whitespace-pre-line block text-left">{getPropertyDisplay(p)}</span> : d.propertyId;
                      })() : '—'}
                    </td>
                    <td className="font-semibold">{d.totalAmount.toLocaleString()} ر.ع</td>
                    <td>
                      <span className="admin-badge">{d.status}</span>
                      {(d.status === 'APPROVED' || d.status === 'PAID') && !d.journalEntryId && (
                        <span className="mr-1 inline-block px-2 py-0.5 text-xs rounded bg-amber-100 text-amber-800" title={ar ? 'لم يُرحّل بعد' : 'Not posted yet'}>
                          {ar ? 'غير مرحّل' : 'unposted'}
                        </span>
                      )}
                    </td>
                    <td>
                      <button type="button" onClick={() => setPrintDocument(d)} className="text-sm admin-accent-text hover:underline">
                        📄 {ar ? 'عرض / طباعة / تنزيل' : 'View / Print / Download'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {useDb && (documentsTotal ?? 0) > documentsCount && (
          <div className="border-t border-gray-100 px-6 py-4 text-center">
            <button type="button" onClick={loadMoreDocuments} disabled={loadingMoreDocs} className="admin-btn-secondary text-sm !py-2">
              {loadingMoreDocs ? (ar ? 'جاري التحميل...' : 'Loading...') : (ar ? `تحميل المزيد (${documentsCount}/${documentsTotal})` : `Load more (${documentsCount}/${documentsTotal})`)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
