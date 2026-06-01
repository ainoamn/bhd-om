'use client';

import { useMemo } from 'react';
import Icon from '@/components/icons/Icon';
import SortSelect, { type SortOption } from '@/components/admin/SortSelect';
import { getContactDisplayFull, type Contact } from '@/lib/data/addressBook';
import { getPropertyById, type Property } from '@/lib/data/properties';
import type { AccountingDocument } from '@/lib/data/accounting';
import styles from '@/components/admin/accounting.module.css';

type ProjectListItem = { id: number; serialNumber?: string; titleAr?: string; titleEn?: string };

export default function AccountingChequesTab(props: {
  ar: boolean;
  locale: string;
  documents: AccountingDocument[];
  contacts: Contact[];
  sortDocuments: SortOption;
  setSortDocuments: (v: SortOption) => void;
  filterFromDate: string;
  filterToDate: string;
  filterContactId: string;
  filterPropertyId: string;
  filterProjectId: string;
  searchQuery: string;
  projectsList: ProjectListItem[];
  getPropertyDisplay: (p: Property) => string;
  getProjectDisplay: (p: ProjectListItem) => string;
  setPrintDocument: (d: AccountingDocument) => void;
  onAddCheque: () => void;
}) {
  const {
    ar,
    locale,
    documents,
    contacts,
    sortDocuments,
    setSortDocuments,
    filterFromDate,
    filterToDate,
    filterContactId,
    filterPropertyId,
    filterProjectId,
    searchQuery,
    projectsList,
    getPropertyDisplay,
    getProjectDisplay,
    setPrintDocument,
    onAddCheque,
  } = props;

  const chequesList = useMemo(() => {
    let list = documents.filter((d) => d.paymentMethod === 'CHEQUE');
    if (filterFromDate) list = list.filter((d) => d.date >= filterFromDate);
    if (filterToDate) list = list.filter((d) => d.date <= filterToDate);
    if (filterContactId) list = list.filter((d) => d.contactId === filterContactId);
    if (filterPropertyId) list = list.filter((d) => d.propertyId === parseInt(filterPropertyId, 10));
    if (filterProjectId) list = list.filter((d) => d.projectId === parseInt(filterProjectId, 10));
    if (searchQuery?.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (d) =>
          (d.serialNumber || '').toLowerCase().includes(q) ||
          (d.chequeNumber || d.paymentReference || '').toLowerCase().includes(q) ||
          (d.descriptionAr || '').toLowerCase().includes(q) ||
          (d.chequeBankName || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [
    documents,
    filterFromDate,
    filterToDate,
    filterContactId,
    filterPropertyId,
    filterProjectId,
    searchQuery,
  ]);

  const sortedCheques = useMemo(() => {
    const getContactName = (d: AccountingDocument) =>
      d.contactId ? getContactDisplayFull(contacts.find((c) => c.id === d.contactId)!, locale) : '';
    const getPropDisplay = (d: AccountingDocument) => {
      const p = d.propertyId ? getPropertyById(d.propertyId) : null;
      return p ? getPropertyDisplay(p) : '';
    };
    const getProjDisplay = (d: AccountingDocument) => {
      const p = d.projectId ? projectsList.find((x) => x.id === d.projectId) : null;
      return p ? getProjectDisplay(p) : '';
    };
    return [...chequesList].sort((a, b) => {
      switch (sortDocuments) {
        case 'dateDesc':
          return b.date.localeCompare(a.date);
        case 'dateAsc':
          return a.date.localeCompare(b.date);
        case 'number':
          return (a.serialNumber || '').localeCompare(b.serialNumber || '');
        case 'property':
          return getPropDisplay(a).localeCompare(getPropDisplay(b));
        case 'alphabetical':
          return getContactName(a).localeCompare(getContactName(b));
        default:
          return 0;
      }
    });
  }, [chequesList, sortDocuments, contacts, locale, getPropertyDisplay, projectsList, getProjectDisplay]);

  return (
    <div className={styles.featureSection} data-testid="accounting-tab-cheques">
      <div className={`${styles.featureSectionHeader} flex-wrap`}>
        <div className={styles.featureSectionIcon}>
          <Icon name="archive" className="h-5 w-5" />
        </div>
        <h4 className={styles.featureSectionTitle}>{ar ? 'الشيكات' : 'Cheques'}</h4>
        <SortSelect value={sortDocuments} onChange={setSortDocuments} ar={ar} />
        <div className={ar ? 'mr-auto' : 'ml-auto'}>
          <button type="button" onClick={onAddCheque} className="admin-btn-primary text-sm">
            {ar ? '➕ إضافة شيك' : '➕ Add Cheque'}
          </button>
        </div>
      </div>
      <div className={styles.featureSectionBody}>
        <div className="mb-6 flex flex-wrap gap-6">
          <div>
            <p className={styles.statCardLabel}>{ar ? 'إجمالي الشيكات' : 'Total Cheques'}</p>
            <p className={`${styles.statCardValue} ${styles.statCardAccent}`}>
              {chequesList.reduce((s, d) => s + d.totalAmount, 0).toLocaleString()} ر.ع
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">{ar ? 'تحت التحصيل' : 'Receivable'}</p>
            <p className="font-semibold">
              {chequesList.filter((d) => d.type === 'RECEIPT').reduce((s, d) => s + d.totalAmount, 0).toLocaleString()} ر.ع
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">{ar ? 'مدفوعة' : 'Payable'}</p>
            <p className="font-semibold">
              {chequesList.filter((d) => d.type === 'PAYMENT').reduce((s, d) => s + d.totalAmount, 0).toLocaleString()} ر.ع
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="admin-table w-full">
            <thead>
              <tr>
                <th>{ar ? 'التاريخ' : 'Date'}</th>
                <th>{ar ? 'الرقم' : 'Number'}</th>
                <th>{ar ? 'رقم الشيك' : 'Cheque #'}</th>
                <th>{ar ? 'تاريخ الاستحقاق' : 'Due Date'}</th>
                <th>{ar ? 'البنك' : 'Bank'}</th>
                <th>{ar ? 'العميل' : 'Contact'}</th>
                <th>{ar ? 'العقار' : 'Property'}</th>
                <th>{ar ? 'المشروع' : 'Project'}</th>
                <th>{ar ? 'النوع' : 'Type'}</th>
                <th>{ar ? 'المبلغ' : 'Amount'}</th>
                <th>{ar ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {sortedCheques.map((d) => (
                <tr key={d.id}>
                  <td>{new Date(d.date).toLocaleDateString(ar ? 'ar-OM' : 'en-GB')}</td>
                  <td className="font-mono">{d.serialNumber}</td>
                  <td>{d.chequeNumber || d.paymentReference || '—'}</td>
                  <td>
                    {d.chequeDueDate || d.dueDate
                      ? new Date(d.chequeDueDate || d.dueDate!).toLocaleDateString(ar ? 'ar-OM' : 'en-GB')
                      : '—'}
                  </td>
                  <td>{d.chequeBankName || '—'}</td>
                  <td>
                    {d.contactId ? getContactDisplayFull(contacts.find((c) => c.id === d.contactId)!, locale) : '—'}
                  </td>
                  <td className="text-sm align-top">
                    {d.propertyId
                      ? (() => {
                          const p = getPropertyById(d.propertyId!);
                          return p ? (
                            <span className="whitespace-pre-line block text-left">{getPropertyDisplay(p)}</span>
                          ) : (
                            d.propertyId
                          );
                        })()
                      : '—'}
                  </td>
                  <td className="text-sm">
                    {d.projectId
                      ? (() => {
                          const p = projectsList.find((x) => x.id === d.projectId);
                          return p ? getProjectDisplay(p) : '';
                        })()
                      : '—'}
                  </td>
                  <td>
                    <span className={styles.badge}>
                      {d.type === 'RECEIPT' ? (ar ? 'تحت التحصيل' : 'Receivable') : ar ? 'مدفوع' : 'Payable'}
                    </span>
                  </td>
                  <td className="font-semibold">{d.totalAmount.toLocaleString()} ر.ع</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => setPrintDocument(d)}
                      className="text-sm admin-accent-text hover:underline"
                    >
                      📄 {ar ? 'عرض' : 'View'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {chequesList.length === 0 && (
          <p className="text-gray-500 py-8 text-center">
            {ar ? 'لا توجد شيكات. أضف شيكاً يدوياً أو من صفحة عقار/مشروع.' : 'No cheques. Add one manually or from property/project page.'}
          </p>
        )}
      </div>
    </div>
  );
}
