/**
 * Accounting API Client - للاتصال بـ REST API عند استخدام قاعدة البيانات
 */

const BASE = '/api/accounting';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

/** جلب بيانات المحاسبة (paginated bootstrap) */
export async function fetchAccountingData(params?: { fromDate?: string; toDate?: string; limit?: number }) {
  const sp = new URLSearchParams();
  if (params?.fromDate) sp.set('fromDate', params.fromDate);
  if (params?.toDate) sp.set('toDate', params.toDate);
  if (params?.limit) sp.set('limit', String(params.limit));
  return fetchJson<{
    accounts: unknown[];
    documents: unknown[];
    journalEntries: unknown[];
    periods: unknown[];
    meta?: {
      documentsTotal: number;
      journalTotal: number;
      documentsTruncated: boolean;
      journalTruncated: boolean;
    };
  }>(`${BASE}/data?${sp}`);
}

export async function fetchJournalEntries(params?: { fromDate?: string; toDate?: string; limit?: number; offset?: number }) {
  const sp = new URLSearchParams();
  if (params?.fromDate) sp.set('fromDate', params.fromDate);
  if (params?.toDate) sp.set('toDate', params.toDate);
  if (params?.limit) sp.set('limit', String(params.limit));
  if (params?.offset) sp.set('offset', String(params.offset));
  return fetchJson<unknown[]>(`${BASE}/journal?${sp}`);
}

export async function fetchDocuments(params?: { fromDate?: string; toDate?: string; type?: string; limit?: number; offset?: number }) {
  const sp = new URLSearchParams();
  if (params?.fromDate) sp.set('fromDate', params.fromDate);
  if (params?.toDate) sp.set('toDate', params.toDate);
  if (params?.type) sp.set('type', params.type);
  if (params?.limit) sp.set('limit', String(params.limit));
  if (params?.offset) sp.set('offset', String(params.offset));
  return fetchJson<unknown[]>(`${BASE}/documents?${sp}`);
}

export async function fetchAccounts() {
  return fetchJson<unknown[]>(`${BASE}/accounts`);
}

export async function createJournalEntry(data: Record<string, unknown>) {
  return fetchJson<unknown>(`${BASE}/journal`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function createDocument(data: Record<string, unknown>) {
  return fetchJson<any>(`${BASE}/documents`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchForecast(params?: { months?: number; forecastMonths?: number }) {
  const sp = new URLSearchParams(params as any);
  return fetchJson<any>(`${BASE}/forecast?${sp}`);
}

export async function fetchReports(params: { fromDate?: string; toDate?: string; asOfDate?: string; report: string }) {
  const sp = new URLSearchParams(params);
  return fetchJson<any>(`${BASE}/reports?${sp}`);
}

export async function fetchPeriods() {
  return fetchJson<any[]>(`${BASE}/periods`);
}

export async function lockPeriod(periodId: string, userId?: string) {
  return fetchJson<any>(`${BASE}/periods`, {
    method: 'POST',
    body: JSON.stringify({ periodId, userId }),
  });
}

export async function fetchAuditLog(params?: { entityType?: string; entityId?: string; limit?: number }) {
  const sp = new URLSearchParams(params as Record<string, string>);
  return fetchJson<unknown[]>(`${BASE}/audit?${sp}`);
}

export async function fetchJournalEntriesPage(params?: { fromDate?: string; toDate?: string; limit?: number; offset?: number }) {
  const sp = new URLSearchParams();
  if (params?.fromDate) sp.set('fromDate', params.fromDate);
  if (params?.toDate) sp.set('toDate', params.toDate);
  sp.set('limit', String(params?.limit ?? 50));
  sp.set('offset', String(params?.offset ?? 0));
  const res = await fetch(`${BASE}/journal?${sp}`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch journal');
  const items = (await res.json()) as unknown[];
  return { items, total: Number(res.headers.get('X-Total-Count') || items.length) };
}

export async function fetchDocumentsPage(params?: { fromDate?: string; toDate?: string; type?: string; limit?: number; offset?: number }) {
  const sp = new URLSearchParams();
  if (params?.fromDate) sp.set('fromDate', params.fromDate);
  if (params?.toDate) sp.set('toDate', params.toDate);
  if (params?.type) sp.set('type', params.type);
  sp.set('limit', String(params?.limit ?? 50));
  sp.set('offset', String(params?.offset ?? 0));
  const res = await fetch(`${BASE}/documents?${sp}`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch documents');
  const items = (await res.json()) as unknown[];
  return { items, total: Number(res.headers.get('X-Total-Count') || items.length) };
}

export async function fetchVatReport(params: { fromDate?: string; toDate?: string }) {
  const sp = new URLSearchParams({ report: 'vat', ...params } as Record<string, string>);
  return fetchJson<{
    summary: {
      vatOutput: number;
      vatInput: number;
      netVatPayable: number;
      taxableSales: number;
      taxablePurchases: number;
      documentCount: number;
      standardRate: number;
    };
    lines: Array<{
      serialNumber: string;
      date: string;
      type: string;
      netAmount: number;
      vatAmount: number;
      direction: string;
    }>;
    fromDate: string;
    toDate: string;
  }>(`${BASE}/reports?${sp}`);
}

export async function fetchAgingReport(params: { ledger?: 'ar' | 'ap'; asOfDate?: string; fromDate?: string; toDate?: string }) {
  const sp = new URLSearchParams({ report: 'aging', ledger: params.ledger || 'ar' });
  if (params.asOfDate) sp.set('asOfDate', params.asOfDate);
  if (params.fromDate) sp.set('fromDate', params.fromDate);
  if (params.toDate) sp.set('toDate', params.toDate);
  return fetchJson<{
    ledger: 'ar' | 'ap';
    asOfDate: string;
    totalOutstanding: number;
    buckets: Array<{ bucket: string; bucketAr: string; amount: number; count: number }>;
    lines: Array<{
      serialNumber: string;
      contactName?: string;
      dueDate: string;
      amount: number;
      daysOverdue: number;
      bucket: string;
    }>;
  }>(`${BASE}/reports?${sp}`);
}

export async function scanInvoiceFromText(params: { text?: string; fileName?: string; attachmentUrl?: string }) {
  return fetchJson<{
    type: 'INVOICE' | 'PURCHASE_INV';
    date?: string;
    dueDate?: string;
    amount?: number;
    netAmount?: number;
    vatAmount?: number;
    vatRate?: number;
    reference?: string;
    descriptionAr?: string;
    descriptionEn?: string;
    vendorHint?: string;
    confidence: string;
    explanationAr: string;
    explanationEn: string;
    attachmentUrl?: string;
  }>(`${BASE}/ai/scan-invoice`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function fetchCashFlowReport(params: { fromDate?: string; toDate?: string }) {
  const sp = new URLSearchParams({ report: 'cashflow', ...params } as Record<string, string>);
  return fetchJson<{
    report: 'cashflow';
    fromDate: string;
    toDate: string;
    operating: number;
    investing: number;
    financing: number;
    netChange: number;
    cashIn: number;
    cashOut: number;
  }>(`${BASE}/reports?${sp}`);
}

export async function fetchPeriodCompareReport(params: { fromDate?: string; toDate?: string }) {
  const sp = new URLSearchParams({ report: 'compare', ...params } as Record<string, string>);
  return fetchJson<{
    report: 'compare';
    current: { fromDate: string; toDate: string; revenue: number; expense: number; netIncome: number };
    previous: { fromDate: string; toDate: string; revenue: number; expense: number; netIncome: number };
    delta: {
      revenue: number;
      expense: number;
      netIncome: number;
      revenuePct: number | null;
      expensePct: number | null;
      netIncomePct: number | null;
    };
  }>(`${BASE}/reports?${sp}`);
}

export async function fetchBankStatementReport(params: {
  bankAccountId: string;
  fromDate?: string;
  toDate?: string;
}) {
  const sp = new URLSearchParams({
    report: 'bankStatement',
    bankAccountId: params.bankAccountId,
    ...(params.fromDate ? { fromDate: params.fromDate } : {}),
    ...(params.toDate ? { toDate: params.toDate } : {}),
  });
  return fetchJson<{
    report: 'bankStatement';
    bankAccountId: string;
    fromDate?: string;
    toDate?: string;
    lines: Array<{
      entryId: string;
      date: string;
      descriptionAr?: string | null;
      descriptionEn?: string | null;
      contactId?: string | null;
      propertyId?: number | null;
      debit: number;
      credit: number;
    }>;
    balance: { debit: number; credit: number; balance: number };
  }>(`${BASE}/reports?${sp}`);
}

export async function fetchPropertyLedgerReport(params: {
  propertyId?: number;
  contactId?: string;
  fromDate?: string;
  toDate?: string;
}) {
  const sp = new URLSearchParams({ report: 'propertyLedger' });
  if (params.propertyId != null) sp.set('propertyId', String(params.propertyId));
  if (params.contactId) sp.set('contactId', params.contactId);
  if (params.fromDate) sp.set('fromDate', params.fromDate);
  if (params.toDate) sp.set('toDate', params.toDate);
  return fetchJson<{
    report: 'propertyLedger';
    fromDate?: string;
    toDate?: string;
    propertyId?: number;
    contactId?: string;
    entries: Array<{
      id: string;
      serialNumber: string;
      date: string;
      descriptionAr?: string | null;
      descriptionEn?: string | null;
      documentType?: string;
      totalDebit: number;
      totalCredit: number;
      bankAccountId?: string | null;
      contactId?: string | null;
      propertyId?: number | null;
    }>;
    totals: { debit: number; credit: number; count: number };
  }>(`${BASE}/reports?${sp}`);
}

export async function suggestJournalEntry(description: string, amount?: number) {
  return fetchJson<{
    lines: Array<{ accountId: string; debit: number; credit: number; descriptionAr?: string }>;
    explanationAr: string;
    explanationEn: string;
    confidence: string;
    parsedAmount: number;
  }>(`${BASE}/ai/suggest-entry`, {
    method: 'POST',
    body: JSON.stringify({ description, amount }),
  });
}
