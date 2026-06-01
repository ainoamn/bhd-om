'use client';

import { useMemo } from 'react';
import Icon from '@/components/icons/Icon';
import SortSelect, { type SortOption } from '@/components/admin/SortSelect';
import ClaimsPaymentsExportButtons from '@/components/admin/ClaimsPaymentsExportButtons';
import { getContactDisplayFull, type Contact } from '@/lib/data/addressBook';
import { getPropertyById, type Property } from '@/lib/data/properties';
import type { AccountingDocument } from '@/lib/data/accounting';
import styles from '@/components/admin/accounting.module.css';

export default function AccountingClaimsTab(props: {
  ar: boolean;
  locale: string;
  documents: AccountingDocument[];
  contacts: Contact[];
  sortDocuments: SortOption;
  setSortDocuments: (v: SortOption) => void;
  totalClaims: number;
  receivables: number;
  chequesReceivable: number;
  getPropertyDisplay: (p: Property) => string;
}) {
  const {
    ar,
    locale,
    documents,
    contacts,
    sortDocuments,
    setSortDocuments,
    totalClaims,
    receivables,
    chequesReceivable,
    getPropertyDisplay,
  } = props;

  const claimsList = useMemo(() => {
    const rawClaims = documents.filter(
      (d) =>
        (d.type === 'INVOICE' && d.status !== 'PAID' && d.status !== 'CANCELLED') ||
        (d.type === 'RECEIPT' && d.paymentMethod === 'CHEQUE')
    );
    const getContactName = (d: AccountingDocument) =>
      d.contactId ? getContactDisplayFull(contacts.find((c) => c.id === d.contactId)!, locale) : '';
    const getPropDisplay = (d: AccountingDocument) => {
      const p = d.propertyId ? getPropertyById(d.propertyId) : null;
      return p ? getPropertyDisplay(p) : '';
    };
    return [...rawClaims].sort((a, b) => {
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
  }, [documents, sortDocuments, contacts, locale, getPropertyDisplay]);

  const claimsTableData = claimsList.map((d) => ({
    type: d.type === 'RECEIPT' ? (ar ? 'شيك' : 'Cheque') : ar ? 'فاتورة' : 'Invoice',
    number: d.serialNumber,
    contact: d.contactId ? getContactDisplayFull(contacts.find((c) => c.id === d.contactId)!, locale) : '—',
    date: new Date(d.date).toLocaleDateString(ar ? 'ar-OM' : 'en-GB'),
    amount: `${d.totalAmount.toLocaleString()} ر.ع`,
    status: d.type === 'RECEIPT' ? (ar ? 'شيك آجل' : 'Post-dated') : d.status,
  }));

  return (
    <div className={styles.featureSection} data-testid="accounting-tab-claims">
      <div className={`${styles.featureSectionHeader} flex-wrap`}>
        <div className={styles.featureSectionIcon}>
          <Icon name="inbox" className="h-5 w-5" />
        </div>
        <h4 className={styles.featureSectionTitle}>{ar ? 'المطالبات (ذمم مدينة + شيكات)' : 'Receivables & Cheques'}</h4>
        <SortSelect value={sortDocuments} onChange={setSortDocuments} ar={ar} />
        <div className={ar ? 'mr-auto' : 'ml-auto'}>
          <ClaimsPaymentsExportButtons
            tableData={claimsTableData}
            headers={[
              { key: 'type', labelAr: 'النوع', labelEn: 'Type' },
              { key: 'number', labelAr: 'الرقم', labelEn: 'Number' },
              { key: 'contact', labelAr: 'العميل', labelEn: 'Contact' },
              { key: 'date', labelAr: 'التاريخ', labelEn: 'Date' },
              { key: 'amount', labelAr: 'المبلغ', labelEn: 'Amount' },
              { key: 'status', labelAr: 'الحالة', labelEn: 'Status' },
            ]}
            printAreaId="claims-export-area"
            filename={ar ? 'المطالبات' : 'Claims'}
            ar={ar}
          />
        </div>
      </div>
      <div className={styles.featureSectionBody}>
        <div className="mb-6 flex flex-wrap gap-6">
          <div>
            <p className={styles.statCardLabel}>{ar ? 'إجمالي المطالبات' : 'Total Claims'}</p>
            <p className={`${styles.statCardValue} ${styles.statCardAccent}`}>{totalClaims.toLocaleString()} ر.ع</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">{ar ? 'ذمم مدينة (فواتير)' : 'Receivables (invoices)'}</p>
            <p className="font-semibold">{receivables.toLocaleString()} ر.ع</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">{ar ? 'شيكات تحت التحصيل' : 'Cheques receivable'}</p>
            <p className="font-semibold">{chequesReceivable.toLocaleString()} ر.ع</p>
          </div>
        </div>
        <div id="claims-export-area" className="overflow-x-auto">
          <table className="admin-table w-full">
            <thead>
              <tr>
                <th>{ar ? 'النوع' : 'Type'}</th>
                <th>{ar ? 'الرقم' : 'Number'}</th>
                <th>{ar ? 'العميل' : 'Contact'}</th>
                <th>{ar ? 'التاريخ' : 'Date'}</th>
                <th>{ar ? 'المبلغ' : 'Amount'}</th>
                <th>{ar ? 'الحالة' : 'Status'}</th>
              </tr>
            </thead>
            <tbody>
              {claimsList.map((d) => (
                <tr key={d.id}>
                  <td>{d.type === 'RECEIPT' ? (ar ? 'شيك' : 'Cheque') : ar ? 'فاتورة' : 'Invoice'}</td>
                  <td className="font-mono">{d.serialNumber}</td>
                  <td>{d.contactId ? getContactDisplayFull(contacts.find((c) => c.id === d.contactId)!, locale) : '—'}</td>
                  <td>{new Date(d.date).toLocaleDateString(ar ? 'ar-OM' : 'en-GB')}</td>
                  <td className="font-semibold">{d.totalAmount.toLocaleString()} ر.ع</td>
                  <td>
                    <span className={styles.badge}>
                      {d.type === 'RECEIPT' ? (ar ? 'شيك آجل' : 'Post-dated') : d.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {claimsList.length === 0 && (
          <p className="text-gray-500 py-8 text-center">{ar ? 'لا توجد مطالبات أو شيكات' : 'No receivables or cheques'}</p>
        )}
      </div>
    </div>
  );
}
