/**
 * AR/AP Aging Report — from open accounting documents
 */

import { calculateAging, type AgingBucket } from '../ai/analyticsEngine';

export type AgingLine = {
  documentId: string;
  serialNumber: string;
  contactId: string | null;
  contactName?: string;
  date: string;
  dueDate: string;
  amount: number;
  daysOverdue: number;
  bucket: string;
};

export type AgingReportResult = {
  report: 'aging';
  ledger: 'ar' | 'ap';
  asOfDate: string;
  totalOutstanding: number;
  buckets: AgingBucket[];
  lines: AgingLine[];
};

type DocRow = {
  id: string;
  serialNumber: string;
  type: string;
  status: string;
  date: string;
  dueDate?: string | null;
  contactId?: string | null;
  totalAmount?: number | null;
  netAmount?: number | null;
};

function daysBetween(from: string, to: string) {
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  return Math.floor((b - a) / (24 * 60 * 60 * 1000));
}

function bucketKey(daysOverdue: number): string {
  if (daysOverdue <= 0) return 'current';
  if (daysOverdue <= 30) return '1-30';
  if (daysOverdue <= 60) return '31-60';
  if (daysOverdue <= 90) return '61-90';
  return '90+';
}

export function buildAgingReport(
  docs: DocRow[],
  ledger: 'ar' | 'ap',
  asOfDate: string,
  contactNames?: Record<string, string>
): AgingReportResult {
  const openTypes = ledger === 'ar' ? new Set(['INVOICE']) : new Set(['PURCHASE_INV']);
  const lines: AgingLine[] = [];

  for (const doc of docs) {
    if (!openTypes.has(doc.type)) continue;
    if (doc.status === 'PAID' || doc.status === 'CANCELLED') continue;
    const amount = doc.totalAmount ?? doc.netAmount ?? 0;
    if (amount <= 0) continue;
    const dueDate = doc.dueDate?.slice(0, 10) || doc.date;
    const daysOverdue = daysBetween(dueDate, asOfDate);
    lines.push({
      documentId: doc.id,
      serialNumber: doc.serialNumber,
      contactId: doc.contactId ?? null,
      contactName: doc.contactId && contactNames?.[doc.contactId] ? contactNames[doc.contactId] : undefined,
      date: doc.date,
      dueDate,
      amount,
      daysOverdue,
      bucket: bucketKey(daysOverdue),
    });
  }

  lines.sort((a, b) => b.daysOverdue - a.daysOverdue);

  const buckets = calculateAging(
    lines.map((l) => ({ amount: l.amount, dueDate: l.dueDate })),
    asOfDate
  );

  return {
    report: 'aging',
    ledger,
    asOfDate,
    totalOutstanding: Math.round(lines.reduce((s, l) => s + l.amount, 0) * 100) / 100,
    buckets,
    lines,
  };
}
