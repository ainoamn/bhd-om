/**
 * Journal Engine - Core Brain
 * Double Entry | Balance Check | Precision Control | Referential Integrity
 * لا قيد بدون مستند (للعمليات المالية - القيود اليدوية استثناء)
 */

import type { JournalEntry, JournalLine } from '../domain/types';
import { getStored, saveStored } from '../data/storage';
import { STORAGE_KEYS } from '../data/storage';
import { appendAuditLog } from '../audit/auditEngine';
import { isPeriodLocked } from '../compliance/periodEngine';

const PRECISION = 2;
const BALANCE_TOLERANCE = 0.01;

function generateId(): string {
  return `JRN-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function roundAmount(n: number): number {
  return Math.round(n * Math.pow(10, PRECISION)) / Math.pow(10, PRECISION);
}

function generateSerial(): string {
  const year = new Date().getFullYear();
  const entries = getStored<JournalEntry>(STORAGE_KEYS.JOURNAL);
  const count = entries.filter((e) => e.createdAt.startsWith(String(year)) && !e.replacedBy).length + 1;
  return `JRN-${year}-${String(count).padStart(4, '0')}`;
}

function validateBalance(lines: JournalLine[]): { totalDebit: number; totalCredit: number; balanced: boolean } {
  const totalDebit = roundAmount(lines.reduce((s, l) => s + (l.debit || 0), 0));
  const totalCredit = roundAmount(lines.reduce((s, l) => s + (l.credit || 0), 0));
  const balanced = Math.abs(totalDebit - totalCredit) <= BALANCE_TOLERANCE;
  return { totalDebit, totalCredit, balanced };
}

export function createJournalEntry(
  data: Omit<JournalEntry, 'id' | 'serialNumber' | 'version' | 'totalDebit' | 'totalCredit' | 'createdAt' | 'updatedAt'>,
  userId?: string
): JournalEntry {
  if (isPeriodLocked(data.date)) {
    throw new Error('لا يمكن الترحيل لفترة مغلقة');
  }
  const { totalDebit, totalCredit, balanced } = validateBalance(data.lines);
  if (!balanced) {
    throw new Error('قيد غير متوازن: المدين يجب أن يساوي الدائن');
  }
  const now = new Date().toISOString();
  const entry: JournalEntry = {
    ...data,
    id: generateId(),
    version: 1,
    serialNumber: generateSerial(),
    totalDebit,
    totalCredit,
    status: data.status || 'APPROVED',
    createdAt: now,
    updatedAt: now,
  };
  const entries = getStored<JournalEntry>(STORAGE_KEYS.JOURNAL);
  entries.unshift(entry);
  saveStored(STORAGE_KEYS.JOURNAL, entries);
  appendAuditLog({
    action: 'CREATE',
    entityType: 'JOURNAL_ENTRY',
    entityId: entry.id,
    userId,
    newState: JSON.stringify({ serialNumber: entry.serialNumber, totalDebit, totalCredit }),
  });
  return entry;
}

export function updateJournalEntry(
  id: string,
  data: Partial<Pick<JournalEntry, 'lines' | 'descriptionAr' | 'descriptionEn' | 'status'>>,
  userId?: string
): JournalEntry | null {
  const entries = getStored<JournalEntry>(STORAGE_KEYS.JOURNAL);
  const idx = entries.findIndex((e) => e.id === id);
  if (idx < 0) return null;
  const existing = entries[idx];
  if (existing.replacedBy) return null;
  if (isPeriodLocked(existing.date)) {
    throw new Error('لا يمكن تعديل قيد في فترة مغلقة');
  }
  const lines = data.lines ?? existing.lines;
  const { totalDebit, totalCredit, balanced } = validateBalance(lines);
  if (!balanced) throw new Error('قيد غير متوازن');
  const updated: JournalEntry = {
    ...existing,
    ...data,
    lines,
    totalDebit,
    totalCredit,
    updatedAt: new Date().toISOString(),
  };
  entries[idx] = updated;
  saveStored(STORAGE_KEYS.JOURNAL, entries);
  appendAuditLog({
    action: 'UPDATE',
    entityType: 'JOURNAL_ENTRY',
    entityId: id,
    userId,
    previousState: JSON.stringify({ totalDebit: existing.totalDebit, totalCredit: existing.totalCredit }),
    newState: JSON.stringify({ totalDebit, totalCredit }),
  });
  return updated;
}

export function reverseJournalEntry(id: string, reverseDate: string, userId?: string): JournalEntry | null {
  const entries = getStored<JournalEntry>(STORAGE_KEYS.JOURNAL);
  const existing = entries.find((e) => e.id === id);
  if (!existing || existing.replacedBy) return null;
  if (isPeriodLocked(reverseDate)) throw new Error('لا يمكن الترحيل لفترة مغلقة');
  const reverseLines: JournalLine[] = existing.lines.map((l) => ({
    ...l,
    debit: l.credit,
    credit: l.debit,
  }));
  const reversed = createJournalEntry(
    {
      date: reverseDate,
      lines: reverseLines,
      descriptionAr: `قيد معكوس لـ ${existing.serialNumber}`,
      descriptionEn: `Reversal of ${existing.serialNumber}`,
      documentType: 'JOURNAL',
      status: 'APPROVED',
    },
    userId
  );
  const idx = entries.findIndex((e) => e.id === id);
  if (idx >= 0) {
    entries[idx] = { ...entries[idx], replacedBy: reversed.id, updatedAt: new Date().toISOString() };
    saveStored(STORAGE_KEYS.JOURNAL, entries);
  }
  appendAuditLog({
    action: 'REVERSE',
    entityType: 'JOURNAL_ENTRY',
    entityId: id,
    userId,
    reason: `Reversed by ${reversed.serialNumber}`,
  });
  return reversed;
}

export function cancelJournalEntry(id: string, userId?: string): JournalEntry | null {
  return updateJournalEntry(id, { status: 'CANCELLED' }, userId);
}

export function getAllJournalEntries(): JournalEntry[] {
  const raw = getStored<JournalEntry>(STORAGE_KEYS.JOURNAL);
  return raw
    .map((e) => ({ ...e, version: e.version ?? 1 }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
