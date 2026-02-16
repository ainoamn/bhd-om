/**
 * Period Management - لا ترحيل لفترة مغلقة
 * Period Lock Enforcement
 */

import type { FiscalPeriod } from '../domain/types';
import { getStored, saveStored } from '../data/storage';
import { STORAGE_KEYS } from '../data/storage';
import { appendAuditLog } from '../audit/auditEngine';

function generateId(): string {
  return `PER-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getFiscalPeriods(): FiscalPeriod[] {
  return getStored<FiscalPeriod>(STORAGE_KEYS.PERIODS).sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );
}

export function getPeriodByDate(date: string): FiscalPeriod | null {
  const d = new Date(date).getTime();
  return getFiscalPeriods().find((p) => {
    const start = new Date(p.startDate).getTime();
    const end = new Date(p.endDate).getTime();
    return d >= start && d <= end;
  }) || null;
}

export function isPeriodLocked(date: string): boolean {
  const period = getPeriodByDate(date);
  return period?.isLocked ?? false;
}

export function lockPeriod(periodId: string, userId?: string): FiscalPeriod | null {
  const periods = getFiscalPeriods();
  const idx = periods.findIndex((p) => p.id === periodId);
  if (idx < 0) return null;
  const period = periods[idx];
  if (period.isLocked) return period;
  const updated: FiscalPeriod = {
    ...period,
    isLocked: true,
    closedAt: new Date().toISOString(),
    closedBy: userId,
  };
  periods[idx] = updated;
  saveStored(STORAGE_KEYS.PERIODS, periods);
  appendAuditLog({
    action: 'PERIOD_LOCK',
    entityType: 'PERIOD',
    entityId: periodId,
    userId,
    reason: 'Period closed for posting',
  });
  return updated;
}

export function createFiscalPeriod(startDate: string, endDate: string, code?: string): FiscalPeriod {
  const year = startDate.slice(0, 4);
  const period: FiscalPeriod = {
    id: generateId(),
    code: code || `FY-${year}`,
    startDate,
    endDate,
    isLocked: false,
  };
  const periods = getFiscalPeriods();
  periods.push(period);
  saveStored(STORAGE_KEYS.PERIODS, periods);
  return period;
}

export function ensureDefaultPeriods(): void {
  const periods = getFiscalPeriods();
  if (periods.length > 0) return;
  const year = new Date().getFullYear();
  createFiscalPeriod(`${year}-01-01`, `${year}-12-31`, `FY-${year}`);
}
