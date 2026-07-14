'use client';

import { useMemo } from 'react';
import DateInput from '@/components/shared/DateInput';
import { getContactDisplayFull, type Contact } from '@/lib/data/addressBook';
import { getBankAccountDisplay, type BankAccount } from '@/lib/data/bankAccounts';
import { DOC_TYPE_LABELS } from '@/lib/accounting/ui/documentLabels';
import type { DocumentType } from '@/lib/data/accounting';
import type { Property } from '@/lib/data/properties';
import type { AccountingHubTabId } from '@/lib/accounting/ui/hubTabIds';
import styles from '@/components/admin/accounting.module.css';

export type { AccountingHubTabId };

type ProjectListItem = { id: number; serialNumber?: string; titleAr?: string; titleEn?: string };

export default function AccountingHubFilterBar(props: {
  ar: boolean;
  locale: string;
  activeTab: AccountingHubTabId;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  filterFromDate: string;
  setFilterFromDate: (v: string) => void;
  filterToDate: string;
  setFilterToDate: (v: string) => void;
  filterContactId: string;
  setFilterContactId: (v: string) => void;
  filterBankId: string;
  setFilterBankId: (v: string) => void;
  filterPropertyId: string;
  setFilterPropertyId: (v: string) => void;
  filterProjectId: string;
  setFilterProjectId: (v: string) => void;
  filterDocType: DocumentType | '';
  setFilterDocType: (v: DocumentType | '') => void;
  contacts: Contact[];
  bankAccounts: BankAccount[];
  mergedProperties: Property[];
  projectsList: ProjectListItem[];
  getPropertyDisplay: (p: Property) => string;
  getProjectDisplay: (p: ProjectListItem) => string;
}) {
  const {
    ar,
    locale,
    activeTab,
    searchQuery,
    setSearchQuery,
    filterFromDate,
    setFilterFromDate,
    filterToDate,
    setFilterToDate,
    filterContactId,
    setFilterContactId,
    filterBankId,
    setFilterBankId,
    filterPropertyId,
    setFilterPropertyId,
    filterProjectId,
    setFilterProjectId,
    filterDocType,
    setFilterDocType,
    contacts,
    bankAccounts,
    mergedProperties,
    projectsList,
    getPropertyDisplay,
    getProjectDisplay,
  } = props;

  return (
    <div className={styles.filterBar} data-testid="accounting-hub-filters">
      <div className={styles.filterField}>
        <label className={styles.filterLabel}>{ar ? 'بحث' : 'Search'}</label>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={ar ? 'رقم، وصف...' : 'Number, desc...'}
          className={styles.filterInput}
        />
      </div>
      <div className="w-40">
        <label className={styles.filterLabel}>{ar ? 'من' : 'From'}</label>
        <DateInput value={filterFromDate} onChange={setFilterFromDate} locale={locale} className={styles.filterInput} />
      </div>
      <div className="w-40">
        <label className={styles.filterLabel}>{ar ? 'إلى' : 'To'}</label>
        <DateInput value={filterToDate} onChange={setFilterToDate} locale={locale} className={styles.filterInput} />
      </div>
      <div className="w-44">
        <label className={styles.filterLabel}>{ar ? 'العميل' : 'Contact'}</label>
        <select value={filterContactId} onChange={(e) => setFilterContactId(e.target.value)} className={styles.filterInput}>
          <option value="">{ar ? 'الكل' : 'All'}</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>{getContactDisplayFull(c, locale)}</option>
          ))}
        </select>
      </div>
      {(activeTab === 'documents' || activeTab === 'journal' || activeTab === 'cheques') && (
        <>
          {activeTab !== 'cheques' && (
            <div className="w-40">
              <label className={styles.filterLabel}>{ar ? 'الحساب البنكي' : 'Bank'}</label>
              <select value={filterBankId} onChange={(e) => setFilterBankId(e.target.value)} className={styles.filterInput}>
                <option value="">{ar ? 'الكل' : 'All'}</option>
                <option value="CASH">{ar ? 'الصندوق' : 'Cash'}</option>
                {bankAccounts.filter((b) => b.isActive).map((b) => (
                  <option key={b.id} value={b.id}>{getBankAccountDisplay(b)}</option>
                ))}
              </select>
            </div>
          )}
          <div className="w-44">
            <label className={styles.filterLabel}>{ar ? 'العقار' : 'Property'}</label>
            <select value={filterPropertyId} onChange={(e) => setFilterPropertyId(e.target.value)} className={styles.filterInput}>
              <option value="">{ar ? 'الكل' : 'All'}</option>
              {mergedProperties.map((p) => (
                <option key={p.id} value={p.id}>{getPropertyDisplay(p).replace(/\n/g, ' | ')}</option>
              ))}
            </select>
          </div>
          {activeTab === 'cheques' && (
            <div className="w-44">
              <label className={styles.filterLabel}>{ar ? 'المشروع' : 'Project'}</label>
              <select value={filterProjectId} onChange={(e) => setFilterProjectId(e.target.value)} className={styles.filterInput}>
                <option value="">{ar ? 'الكل' : 'All'}</option>
                {projectsList.map((p) => (
                  <option key={p.id} value={p.id}>{getProjectDisplay(p)}</option>
                ))}
              </select>
            </div>
          )}
        </>
      )}
      {(activeTab === 'documents' || activeTab === 'journal' || activeTab === 'sales' || activeTab === 'purchases') && (
        <div className="w-36">
          <label className={styles.filterLabel}>{ar ? 'النوع' : 'Type'}</label>
          <select value={filterDocType} onChange={(e) => setFilterDocType(e.target.value as DocumentType | '')} className={styles.filterInput}>
            <option value="">{ar ? 'الكل' : 'All'}</option>
            {(Object.keys(DOC_TYPE_LABELS) as DocumentType[]).map((t) => (
              <option key={t} value={t}>{ar ? DOC_TYPE_LABELS[t].ar : DOC_TYPE_LABELS[t].en}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
