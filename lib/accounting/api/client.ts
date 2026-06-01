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
  const sp = new URLSearchParams(params as any);
  return fetchJson<any[]>(`${BASE}/audit?${sp}`);
}
