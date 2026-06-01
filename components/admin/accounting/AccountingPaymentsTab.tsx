'use client';

import { useMemo } from 'react';
import Icon from '@/components/icons/Icon';
import SortSelect, { type SortOption } from '@/components/admin/SortSelect';
import ClaimsPaymentsExportButtons from '@/components/admin/ClaimsPaymentsExportButtons';
import { getContactDisplayFull, type Contact } from '@/lib/data/addressBook';
import { getPropertyById, type Property } from '@/lib/data/properties';
import type { BankAccount } from '@/lib/data/bankAccounts';
import type { AccountingDocument } from '@/lib/data/accounting';
import { DOC_TYPE_LABELS } from '@/lib/accounting/ui/documentLabels';
import { resolvePaymentFromAccount, resolvePaymentToAccount } from '@/lib/accounting/ui/paymentFlowLabels';
import styles from '@/components/admin/accounting.module.css';

export default function AccountingPaymentsTab(props: {
  ar: boolean;
  locale: string;
  documents: AccountingDocument[];
  contacts: Contact[];
  bankAccounts: BankAccount[];
  sortDocuments: SortOption;
  setSortDocuments: (v: SortOption) => void;
  paymentsTotal: number;
  getPropertyDisplay: (p: Property) => string;
}) {
  const {
    ar,
    locale,
    documents,
    contacts,
    bankAccounts,
    sortDocuments,
    setSortDocuments,
    paymentsTotal,
    getPropertyDisplay,
  } = props;

  const paymentsList = useMemo(() => {
    const rawPayments = documents.filter((d) => d.type === 'PAYMENT' || d.type === 'RECEIPT');
    const getContactName = (d: AccountingDocument) =>
      d.contactId ? getContactDisplayFull(contacts.find((c) => c.id === d.contactId)!, locale) : '';
    const getPropDisplay = (d: AccountingDocument) => {
      const p = d.propertyId ? getPropertyById(d.propertyId) : null;
      return p ? getPropertyDisplay(p) : '';
    };
    return [...rawPayments].sort((a, b) => {
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

  const paymentsTableData = paymentsList.map((d) => {
    const prop = d.propertyId ? getPropertyById(d.propertyId) : null;
    return {
      date: new Date(d.date).toLocaleDateString(ar ? 'ar-OM' : 'en-GB'),
      number: d.serialNumber,
      type: ar ? DOC_TYPE_LABELS[d.type].ar : DOC_TYPE_LABELS[d.type].en,
      from: resolvePaymentFromAccount(d, ar, bankAccounts),
      to: resolvePaymentToAccount(d, ar, bankAccounts),
      reason: d.descriptionAr || d.descriptionEn || '—',
      property: prop ? getPropertyDisplay(prop) : '—',
      contact: d.contactId ? getContactDisplayFull(contacts.find((c) => c.id === d.contactId)!, locale) : '—',
      amount: `${d.totalAmount.toLocaleString()} ر.ع`,
    };
  });

  return (
    <div className={styles.featureSection} data-testid="accounting-tab-payments">
      <div className={`${styles.featureSectionHeader} flex-wrap`}>
        <div className={styles.featureSectionIcon}>
          <Icon name="archive" className="h-5 w-5" />
        </div>
        <h4 className={styles.featureSectionTitle}>{ar ? 'المدفوعات' : 'Payments'}</h4>
        <SortSelect value={sortDocuments} onChange={setSortDocuments} ar={ar} />
        <div className={ar ? 'mr-auto' : 'ml-auto'}>
          <ClaimsPaymentsExportButtons
            tableData={paymentsTableData}
            headers={[
              { key: 'date', labelAr: 'التاريخ', labelEn: 'Date' },
              { key: 'number', labelAr: 'الرقم', labelEn: 'Number' },
              { key: 'type', labelAr: 'النوع', labelEn: 'Type' },
              { key: 'from', labelAr: 'من حساب', labelEn: 'From account' },
              { key: 'to', labelAr: 'إلى حساب', labelEn: 'To account' },
              { key: 'reason', labelAr: 'السبب / الوصف', labelEn: 'Reason' },
              { key: 'property', labelAr: 'العقار', labelEn: 'Property' },
              { key: 'contact', labelAr: 'العميل', labelEn: 'Contact' },
              { key: 'amount', labelAr: 'المبلغ', labelEn: 'Amount' },
            ]}
            printAreaId="payments-export-area"
            filename={ar ? 'المدفوعات' : 'Payments'}
            ar={ar}
          />
        </div>
      </div>
      <div className={styles.featureSectionBody}>
        <div className="mb-6">
          <p className={styles.statCardLabel}>{ar ? 'إجمالي المدفوعات والإيصالات' : 'Total Payments & Receipts'}</p>
          <p className={`${styles.statCardValue} ${styles.statCardAccent}`}>{paymentsTotal.toLocaleString()} ر.ع</p>
        </div>
        <div id="payments-export-area" className="overflow-x-auto">
          <table className="admin-table w-full">
            <thead>
              <tr>
                <th>{ar ? 'التاريخ' : 'Date'}</th>
                <th>{ar ? 'الرقم' : 'Number'}</th>
                <th>{ar ? 'النوع' : 'Type'}</th>
                <th>{ar ? 'من حساب (استلمنا في)' : 'From account'}</th>
                <th>{ar ? 'إلى حساب' : 'To account'}</th>
                <th>{ar ? 'السبب / الوصف' : 'Reason'}</th>
                <th>{ar ? 'العقار' : 'Property'}</th>
                <th>{ar ? 'العميل' : 'Contact'}</th>
                <th>{ar ? 'المبلغ' : 'Amount'}</th>
              </tr>
            </thead>
            <tbody>
              {paymentsList.map((d) => {
                const prop = d.propertyId ? getPropertyById(d.propertyId) : null;
                return (
                  <tr key={d.id}>
                    <td>{new Date(d.date).toLocaleDateString(ar ? 'ar-OM' : 'en-GB')}</td>
                    <td className="font-mono">{d.serialNumber}</td>
                    <td>{ar ? DOC_TYPE_LABELS[d.type].ar : DOC_TYPE_LABELS[d.type].en}</td>
                    <td className="text-sm">{resolvePaymentFromAccount(d, ar, bankAccounts)}</td>
                    <td className="text-sm">{resolvePaymentToAccount(d, ar, bankAccounts)}</td>
                    <td className="text-sm max-w-[200px] truncate" title={ar ? d.descriptionAr : d.descriptionEn}>
                      {d.descriptionAr || d.descriptionEn || '—'}
                    </td>
                    <td className="text-sm align-top">
                      {prop ? (
                        <span className="whitespace-pre-line block text-left">{getPropertyDisplay(prop)}</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="text-sm">
                      {d.contactId ? getContactDisplayFull(contacts.find((c) => c.id === d.contactId)!, locale) : '—'}
                    </td>
                    <td className="font-semibold">{d.totalAmount.toLocaleString()} ر.ع</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {paymentsList.length === 0 && (
          <p className="text-gray-500 py-8 text-center">{ar ? 'لا توجد مدفوعات' : 'No payments'}</p>
        )}
      </div>
    </div>
  );
}
