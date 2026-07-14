'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SortOption } from '@/components/admin/SortSelect';
import { getContactDisplayFull } from '@/lib/data/addressBook';
import {
  getChartOfAccounts,
  getAllJournalEntries,
  getAllDocuments,
  searchJournalEntries,
  searchDocuments,
  getAuditLog,
  getFiscalPeriods,
  postUnpostedDocuments,
  type ChartAccount,
  type JournalEntry,
  type AccountingDocument,
  type DocumentType,
} from '@/lib/data/accounting';
import { ensureDefaultPeriods } from '@/lib/accounting/compliance/periodEngine';
import { syncPaidBookingsToAccounting, type PropertyBooking } from '@/lib/data/bookings';
import { projects as projectsList, getProjectDisplayText } from '@/lib/data/projects';
import { properties as propertiesList, getPropertyById, getPropertyDisplayText } from '@/lib/data/properties';
import { getAllBankAccounts } from '@/lib/data/bankAccounts';
import {
  fetchAccountingData,
  fetchJournalEntriesPage,
  fetchDocumentsPage,
} from '@/lib/accounting/api/client';
import type { AccountingInitialData } from '@/lib/accounting/types/pageData';
import type { Contact } from '@/lib/data/addressBook';
import type { AccountingHubTabId } from '@/lib/accounting/ui/hubTabIds';

type UseAccountingHubOptions = {
  initialData?: AccountingInitialData;
  locale: string;
  contacts: Contact[];
  activeTab: AccountingHubTabId;
  receiptConfirmKey: number;
  onBookingStorageChange: () => void;
};

export function useAccountingHub(options: UseAccountingHubOptions) {
  const { initialData, locale, contacts, activeTab, receiptConfirmKey, onBookingStorageChange } = options;

  const [accounts, setAccounts] = useState<ChartAccount[]>(initialData?.accounts ?? []);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(initialData?.journalEntries ?? []);
  const [documents, setDocuments] = useState<AccountingDocument[]>(initialData?.documents ?? []);
  const [periods, setPeriods] = useState<Array<{ id: string; code: string; startDate: string; endDate: string; isLocked: boolean }>>(initialData?.periods ?? []);
  const [auditLogs, setAuditLogs] = useState<Array<{ id: string; timestamp: string; action: string; entityType: string; entityId: string; reason?: string }>>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');
  const [filterContactId, setFilterContactId] = useState('');
  const [filterBankId, setFilterBankId] = useState('');
  const [filterPropertyId, setFilterPropertyId] = useState('');
  const [filterProjectId, setFilterProjectId] = useState('');
  const [filterDocType, setFilterDocType] = useState<DocumentType | ''>('');
  const [sortDocuments, setSortDocuments] = useState<SortOption>('dateDesc');
  const [sortJournal, setSortJournal] = useState<SortOption>('dateDesc');
  const [loadingMoreJournal, setLoadingMoreJournal] = useState(false);
  const [loadingMoreDocs, setLoadingMoreDocs] = useState(false);
  const [dataSourceFromApi, setDataSourceFromApi] = useState<boolean | null>(initialData ? true : null);
  const [dataMeta, setDataMeta] = useState(initialData?.meta ?? null);
  const [pendingConfirmBookings, setPendingConfirmBookings] = useState<PropertyBooking[]>([]);

  const useDb = dataSourceFromApi === true;
  const syncRetryRef = useRef(false);
  const skipFirstLoadRef = useRef(!!initialData);
  const bankAccounts = typeof window !== 'undefined' ? getAllBankAccounts() : [];
  const mergedProperties = useMemo(() => propertiesList.map((p) => getPropertyById(p.id) || p), []);

  const getProjectDisplay = useCallback(
    (p: { id: number; serialNumber?: string; titleAr?: string; titleEn?: string }) => getProjectDisplayText(p),
    []
  );
  const getPropertyDisplay = useCallback(
    (p: Parameters<typeof getPropertyDisplayText>[0]) => getPropertyDisplayText(p),
    []
  );

  const loadDataLocal = useCallback(() => {
    if (typeof window !== 'undefined') {
      syncPaidBookingsToAccounting();
      postUnpostedDocuments();
    }
    setAccounts(getChartOfAccounts());
    setJournalEntries(getAllJournalEntries());
    setDocuments(getAllDocuments());
    if (typeof window !== 'undefined') {
      setPeriods(getFiscalPeriods());
      setAuditLogs(getAuditLog());
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchAccountingData({
        fromDate: filterFromDate || undefined,
        toDate: filterToDate || undefined,
      });
      if (Array.isArray(data.accounts)) setAccounts(data.accounts as ChartAccount[]);
      if (Array.isArray(data.documents)) setDocuments(data.documents as AccountingDocument[]);
      if (Array.isArray(data.journalEntries)) setJournalEntries(data.journalEntries as JournalEntry[]);
      if (Array.isArray(data.periods)) setPeriods(data.periods as typeof periods);
      if (data.meta) setDataMeta(data.meta);
      setDataSourceFromApi(true);
      if (typeof window !== 'undefined') {
        const auditRes = await fetch('/api/accounting/audit?limit=50', { credentials: 'include' })
          .then((r) => (r.ok ? r.json() : []))
          .catch(() => []);
        if (Array.isArray(auditRes)) setAuditLogs(auditRes);
        else setAuditLogs(getAuditLog());
      }
    } catch {
      loadDataLocal();
      setDataSourceFromApi(false);
    }
  }, [filterFromDate, filterToDate, loadDataLocal]);

  const loadMoreJournal = useCallback(async () => {
    if (!useDb || loadingMoreJournal) return;
    const total = dataMeta?.journalTotal ?? journalEntries.length;
    if (journalEntries.length >= total) return;
    setLoadingMoreJournal(true);
    try {
      const page = await fetchJournalEntriesPage({
        fromDate: filterFromDate || undefined,
        toDate: filterToDate || undefined,
        limit: 50,
        offset: journalEntries.length,
      });
      setJournalEntries((prev) => [...prev, ...(page.items as JournalEntry[])]);
    } finally {
      setLoadingMoreJournal(false);
    }
  }, [useDb, loadingMoreJournal, dataMeta?.journalTotal, journalEntries.length, filterFromDate, filterToDate]);

  const loadMoreDocuments = useCallback(async () => {
    if (!useDb || loadingMoreDocs) return;
    const total = dataMeta?.documentsTotal ?? documents.length;
    if (documents.length >= total) return;
    setLoadingMoreDocs(true);
    try {
      const page = await fetchDocumentsPage({
        fromDate: filterFromDate || undefined,
        toDate: filterToDate || undefined,
        type: filterDocType || undefined,
        limit: 50,
        offset: documents.length,
      });
      setDocuments((prev) => [...prev, ...(page.items as AccountingDocument[])]);
    } finally {
      setLoadingMoreDocs(false);
    }
  }, [useDb, loadingMoreDocs, dataMeta?.documentsTotal, documents.length, filterFromDate, filterToDate, filterDocType]);

  useEffect(() => {
    if (skipFirstLoadRef.current && !filterFromDate && !filterToDate) {
      skipFirstLoadRef.current = false;
      return;
    }
    loadData();
  }, [filterFromDate, filterToDate, loadData]);

  useEffect(() => {
    if (useDb && documents.length === 0 && journalEntries.length === 0 && !syncRetryRef.current) {
      syncRetryRef.current = true;
      const t = setTimeout(() => loadData(), 3500);
      return () => clearTimeout(t);
    }
  }, [useDb, documents.length, journalEntries.length, loadData]);

  useEffect(() => {
    if (!useDb && typeof window !== 'undefined') ensureDefaultPeriods();
    if (!useDb) {
      const onStorage = (e: StorageEvent) => {
        if (['bhd_chart_of_accounts', 'bhd_journal_entries', 'bhd_accounting_documents', 'bhd_fiscal_periods', 'bhd_audit_log'].includes(e.key || '')) {
          loadDataLocal();
        }
        if (e.key === 'bhd_property_bookings' || e.key === 'bhd_booking_cancellation_requests') {
          onBookingStorageChange();
        }
      };
      window.addEventListener('storage', onStorage);
      return () => window.removeEventListener('storage', onStorage);
    }
  }, [useDb, loadDataLocal, onBookingStorageChange]);

  useEffect(() => {
    if (!useDb || activeTab !== 'dashboard') return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/bookings/pending-confirmation', { credentials: 'include', cache: 'no-store' });
        if (res.ok && !cancelled) {
          const list = await res.json();
          if (Array.isArray(list)) setPendingConfirmBookings(list as PropertyBooking[]);
        }
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, [useDb, activeTab, receiptConfirmKey]);

  const filteredEntries = useMemo(() => {
    if (useDb) {
      let e = journalEntries;
      if (filterFromDate) e = e.filter((x) => x.date >= filterFromDate);
      if (filterToDate) e = e.filter((x) => x.date <= filterToDate);
      if (filterContactId) e = e.filter((x) => x.contactId === filterContactId);
      if (filterBankId) e = e.filter((x) => (filterBankId === 'CASH' ? !x.bankAccountId : x.bankAccountId === filterBankId));
      if (filterPropertyId) e = e.filter((x) => x.propertyId === parseInt(filterPropertyId, 10));
      if (filterDocType) e = e.filter((x) => x.documentType === filterDocType);
      if (searchQuery?.trim()) {
        const q = searchQuery.toLowerCase();
        e = e.filter((x) =>
          (x.serialNumber || '').toLowerCase().includes(q) ||
          (x.descriptionAr || '').toLowerCase().includes(q) ||
          (x.descriptionEn || '').toLowerCase().includes(q)
        );
      }
      return e;
    }
    let e = searchJournalEntries({
      fromDate: filterFromDate || undefined,
      toDate: filterToDate || undefined,
      contactId: filterContactId || undefined,
      bankAccountId: filterBankId && filterBankId !== 'CASH' ? filterBankId : undefined,
      propertyId: filterPropertyId ? parseInt(filterPropertyId, 10) : undefined,
      documentType: filterDocType || undefined,
      query: searchQuery || undefined,
    });
    if (filterBankId === 'CASH') e = e.filter((x) => !x.bankAccountId);
    return e;
  }, [useDb, journalEntries, filterFromDate, filterToDate, filterContactId, filterBankId, filterPropertyId, filterDocType, searchQuery]);

  const filteredDocs = useMemo(() => {
    if (useDb) {
      let d = documents;
      if (filterFromDate) d = d.filter((x) => x.date >= filterFromDate);
      if (filterToDate) d = d.filter((x) => x.date <= filterToDate);
      if (filterContactId) d = d.filter((x) => x.contactId === filterContactId);
      if (filterBankId) d = d.filter((x) => (filterBankId === 'CASH' ? !x.bankAccountId : x.bankAccountId === filterBankId));
      if (filterPropertyId) d = d.filter((x) => x.propertyId === parseInt(filterPropertyId, 10));
      if (filterDocType) d = d.filter((x) => x.type === filterDocType);
      if (searchQuery?.trim()) {
        const q = searchQuery.toLowerCase();
        d = d.filter((x) =>
          (x.serialNumber || '').toLowerCase().includes(q) ||
          (x.descriptionAr || '').toLowerCase().includes(q) ||
          (x.descriptionEn || '').toLowerCase().includes(q)
        );
      }
      return d;
    }
    let d = searchDocuments({
      fromDate: filterFromDate || undefined,
      toDate: filterToDate || undefined,
      contactId: filterContactId || undefined,
      bankAccountId: filterBankId && filterBankId !== 'CASH' ? filterBankId : undefined,
      propertyId: filterPropertyId ? parseInt(filterPropertyId, 10) : undefined,
      type: filterDocType || undefined,
      query: searchQuery || undefined,
    });
    if (filterBankId === 'CASH') d = d.filter((x) => !x.bankAccountId);
    return d;
  }, [useDb, documents, filterFromDate, filterToDate, filterContactId, filterBankId, filterPropertyId, filterDocType, searchQuery]);

  const sortedDocs = useMemo(() => {
    const list = [...filteredDocs];
    const getContactName = (d: AccountingDocument) => {
      const c = contacts.find((x) => x.id === d.contactId);
      return c ? getContactDisplayFull(c, locale) : '';
    };
    const getPropDisplay = (d: AccountingDocument) => {
      const p = d.propertyId ? getPropertyById(d.propertyId) : null;
      return p ? getPropertyDisplay(p) : '';
    };
    list.sort((a, b) => {
      switch (sortDocuments) {
        case 'dateDesc': return b.date.localeCompare(a.date);
        case 'dateAsc': return a.date.localeCompare(b.date);
        case 'number': return (a.serialNumber || '').localeCompare(b.serialNumber || '');
        case 'property': return getPropDisplay(a).localeCompare(getPropDisplay(b));
        case 'alphabetical': return getContactName(a).localeCompare(getContactName(b));
        default: return 0;
      }
    });
    return list;
  }, [filteredDocs, sortDocuments, contacts, locale, getPropertyDisplay]);

  const sortedEntries = useMemo(() => {
    const list = [...filteredEntries];
    const getContactName = (e: JournalEntry) => {
      const c = contacts.find((x) => x.id === e.contactId);
      return c ? getContactDisplayFull(c, locale) : '';
    };
    list.sort((a, b) => {
      switch (sortJournal) {
        case 'dateDesc': return b.date.localeCompare(a.date);
        case 'dateAsc': return a.date.localeCompare(b.date);
        case 'number': return (a.serialNumber || '').localeCompare(b.serialNumber || '');
        case 'property': return String(a.propertyId || '').localeCompare(String(b.propertyId || ''));
        case 'alphabetical': return getContactName(a).localeCompare(getContactName(b));
        default: return 0;
      }
    });
    return list;
  }, [filteredEntries, sortJournal, contacts, locale]);

  const setRangeThisMonth = useCallback(() => {
    const now = new Date();
    setFilterFromDate(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
    setFilterToDate(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10));
  }, []);

  const setRangeLast30 = useCallback(() => {
    const now = new Date();
    setFilterFromDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
    setFilterToDate(now.toISOString().slice(0, 10));
  }, []);

  const setRangeYearToDate = useCallback(() => {
    setFilterFromDate(new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10));
    setFilterToDate(new Date().toISOString().slice(0, 10));
  }, []);

  return {
    accounts,
    setAccounts,
    journalEntries,
    setJournalEntries,
    documents,
    setDocuments,
    periods,
    setPeriods,
    auditLogs,
    setAuditLogs,
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
    sortDocuments,
    setSortDocuments,
    sortJournal,
    setSortJournal,
    loadingMoreJournal,
    loadingMoreDocs,
    useDb,
    dataMeta,
    pendingConfirmBookings,
    setPendingConfirmBookings,
    bankAccounts,
    mergedProperties,
    projectsList,
    getPropertyDisplay,
    getProjectDisplay,
    loadData,
    loadDataLocal,
    loadMoreJournal,
    loadMoreDocuments,
    filteredEntries,
    filteredDocs,
    sortedDocs,
    sortedEntries,
    setRangeThisMonth,
    setRangeLast30,
    setRangeYearToDate,
  };
}
