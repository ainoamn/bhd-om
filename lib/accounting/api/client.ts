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
