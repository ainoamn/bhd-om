import type { CustomReportSource } from '@/lib/admin/customReportExport';

export type ReportScheduleFrequency = 'daily' | 'weekly' | 'monthly';

export interface ReportSchedule {
  id: string;
  nameAr: string;
  nameEn: string;
  source: CustomReportSource;
  columnIds: string[];
  frequency: ReportScheduleFrequency;
  recipientEmail: string;
  enabled: boolean;
  lastRunAt?: string;
  updatedAt: string;
}

const STORAGE_KEY = 'bhd_report_schedules';
const API_URL = '/api/settings/report-schedules';
export const REPORT_SCHEDULES_EVENT = 'bhd_report_schedules_updated';

function readLocal(): ReportSchedule[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ReportSchedule[]) : [];
  } catch {
    return [];
  }
}

function saveLocal(rows: ReportSchedule[], emit = true): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  if (emit) window.dispatchEvent(new Event(REPORT_SCHEDULES_EVENT));
}

function syncToServer(rows: ReportSchedule[]): void {
  if (typeof window === 'undefined') return;
  fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ schedules: rows }),
  }).catch(() => {});
}

export async function hydrateReportSchedulesFromServer(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const res = await fetch(API_URL, { credentials: 'include', cache: 'no-store' });
    if (!res.ok) return;
    const data = (await res.json()) as { schedules?: ReportSchedule[] };
    if (Array.isArray(data.schedules)) {
      saveLocal(data.schedules, false);
      window.dispatchEvent(new Event(REPORT_SCHEDULES_EVENT));
    }
  } catch {
    /* keep local */
  }
}

export function listReportSchedules(): ReportSchedule[] {
  void hydrateReportSchedulesFromServer();
  return readLocal();
}

export function upsertReportSchedule(schedule: ReportSchedule): void {
  const rows = readLocal();
  const idx = rows.findIndex((r) => r.id === schedule.id);
  const next = { ...schedule, updatedAt: new Date().toISOString() };
  if (idx >= 0) rows[idx] = next;
  else rows.unshift(next);
  saveLocal(rows);
  syncToServer(rows);
}

export function deleteReportSchedule(id: string): void {
  const rows = readLocal().filter((r) => r.id !== id);
  saveLocal(rows);
  syncToServer(rows);
}

export function markScheduleRun(id: string): void {
  const rows = readLocal();
  const idx = rows.findIndex((r) => r.id === id);
  if (idx < 0) return;
  rows[idx] = { ...rows[idx], lastRunAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  saveLocal(rows);
  syncToServer(rows);
}
