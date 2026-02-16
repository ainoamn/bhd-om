/**
 * Accounting API Client - للاتصال بـ REST API عند استخدام قاعدة البيانات
 */

const BASE = '/api/accounting';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export async function fetchAccounts() {
  return fetchJson<any[]>(`${BASE}/accounts`);
}

export async function fetchJournalEntries(params?: { fromDate?: string; toDate?: string }) {
  const sp = new URLSearchParams(params);
  return fetchJson<any[]>(`${BASE}/journal?${sp}`);
}

export async function createJournalEntry(data: any) {
  return fetchJson<any>(`${BASE}/journal`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchDocuments(params?: { fromDate?: string; toDate?: string; type?: string }) {
  const sp = new URLSearchParams(params);
  return fetchJson<any[]>(`${BASE}/documents?${sp}`);
}

export async function createDocument(data: any) {
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
