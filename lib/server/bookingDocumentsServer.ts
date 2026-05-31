import { prisma } from '@/lib/prisma';
import { getJsonSetting, upsertJsonSetting } from '@/lib/server/repositories/appSettingsRepo';
import type { BookingDocument, DocumentFileItem } from '@/lib/data/bookingDocuments';
import {
  isBookingStatusEligibleForDocumentUpload,
  parseBookingStorageRow,
} from '@/lib/server/bookingContractGate';

const DOCUMENTS_KEY = 'booking_documents_settings';

export async function loadAllBookingDocuments(): Promise<BookingDocument[]> {
  const value = await getJsonSetting<unknown>(DOCUMENTS_KEY, []);
  return Array.isArray(value) ? (value as BookingDocument[]) : [];
}

export async function saveAllBookingDocuments(docs: BookingDocument[]): Promise<void> {
  await upsertJsonSetting(DOCUMENTS_KEY, docs);
}

export async function getDocumentsForBookingFromDb(bookingId: string): Promise<BookingDocument[]> {
  const all = await loadAllBookingDocuments();
  return all.filter((d) => d.bookingId === bookingId);
}

function normEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function findVerifiedBooking(opts: {
  email: string;
  bookingId?: string;
  propertyId?: number;
}): Promise<Record<string, unknown> | null> {
  const emailNorm = normEmail(opts.email);
  if (!emailNorm || emailNorm.length < 3) return null;

  const rows = await prisma.bookingStorage.findMany({ orderBy: { updatedAt: 'desc' } });
  for (const row of rows) {
    const parsed = parseBookingStorageRow(row.data);
    if (!parsed) continue;
    const id = String(parsed.id || row.bookingId || '');
    if (opts.bookingId && id !== opts.bookingId) continue;
    if (opts.propertyId != null && Number(parsed.propertyId) !== opts.propertyId) continue;
    if (normEmail(String(parsed.email || '')) !== emailNorm) continue;
    if (!isBookingStatusEligibleForDocumentUpload(parsed.status)) continue;
    return { ...parsed, id };
  }
  return null;
}

export async function findBookingForPublicUpload(opts: {
  propertyId: number;
  email: string;
  bookingId?: string;
}): Promise<Record<string, unknown> | null> {
  return findVerifiedBooking(opts);
}

function getDocumentFiles(doc: BookingDocument): DocumentFileItem[] {
  if (doc.files?.length) return doc.files;
  const urls = doc.fileUrls ?? (doc.fileUrl ? [doc.fileUrl] : []);
  const names = doc.fileNames ?? (doc.fileName ? [doc.fileName] : []);
  return urls.map((url, i) => ({ url, name: names[i] || '' }));
}

export async function applyPublicDocumentUpload(opts: {
  bookingId: string;
  email: string;
  docId: string;
  fileUrl: string;
  fileName: string;
}): Promise<{ ok: true; document: BookingDocument } | { ok: false; error: string }> {
  const verified = await findVerifiedBooking({ email: opts.email, bookingId: opts.bookingId });
  if (!verified) return { ok: false, error: 'BOOKING_NOT_FOUND' };

  const all = await loadAllBookingDocuments();
  const idx = all.findIndex((d) => d.id === opts.docId && d.bookingId === opts.bookingId);
  if (idx < 0) return { ok: false, error: 'DOCUMENT_NOT_FOUND' };

  const now = new Date().toISOString();
  const doc = all[idx];
  if (doc.status === 'APPROVED') return { ok: false, error: 'DOCUMENT_ALREADY_APPROVED' };

  const files = [...getDocumentFiles(doc), { url: opts.fileUrl, name: opts.fileName }];
  const urls = files.map((f) => f.url);
  const names = files.map((f) => f.name);
  const updated: BookingDocument = {
    ...doc,
    fileUrl: urls[0],
    fileName: names[0],
    fileUrls: urls,
    fileNames: names,
    files,
    status: 'UPLOADED',
    uploadedAt: now,
    uploadedBy: normEmail(opts.email),
    updatedAt: now,
  };
  all[idx] = updated;
  await saveAllBookingDocuments(all);
  return { ok: true, document: updated };
}

export async function applyPublicDocumentReplace(opts: {
  bookingId: string;
  email: string;
  docId: string;
  oldFileUrl: string;
  newFileUrl: string;
  newFileName: string;
}): Promise<{ ok: true; document: BookingDocument } | { ok: false; error: string }> {
  const verified = await findVerifiedBooking({ email: opts.email, bookingId: opts.bookingId });
  if (!verified) return { ok: false, error: 'BOOKING_NOT_FOUND' };

  const all = await loadAllBookingDocuments();
  const idx = all.findIndex((d) => d.id === opts.docId && d.bookingId === opts.bookingId);
  if (idx < 0) return { ok: false, error: 'DOCUMENT_NOT_FOUND' };

  const now = new Date().toISOString();
  const doc = all[idx];
  const files = getDocumentFiles(doc).map((f) =>
    f.url === opts.oldFileUrl
      ? {
          url: opts.newFileUrl,
          name: opts.newFileName,
          rejectedAt: f.rejectedAt,
          rejectedBy: f.rejectedBy,
          rejectionReasonAr: f.rejectionReasonAr,
          rejectionReasonEn: f.rejectionReasonEn,
          replacedAt: now,
        }
      : f
  );
  const urls = files.map((f) => f.url);
  const names = files.map((f) => f.name);
  const updated: BookingDocument = {
    ...doc,
    fileUrl: urls[0],
    fileName: names[0],
    fileUrls: urls,
    fileNames: names,
    files,
    status: 'UPLOADED',
    updatedAt: now,
  };
  all[idx] = updated;
  await saveAllBookingDocuments(all);
  return { ok: true, document: updated };
}
