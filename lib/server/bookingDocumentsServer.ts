import type { BookingDocument, DocumentFileItem } from '@/lib/data/bookingDocuments';
import {
  isBookingStatusEligibleForDocumentUpload,
} from '@/lib/server/bookingContractGate';
import { findBookingStorageForPublicUpload } from '@/lib/server/repositories/bookingStorageRepo';
import {
  getBookingDocumentFromDb,
  listBookingDocumentsFromDb,
  saveBookingDocumentsToDb,
  upsertBookingDocumentToDb,
} from '@/lib/server/repositories/bookingDocumentStorageRepo';

export async function loadAllBookingDocuments(): Promise<BookingDocument[]> {
  return listBookingDocumentsFromDb({ limit: 500 });
}

export async function saveAllBookingDocuments(docs: BookingDocument[]): Promise<void> {
  await saveBookingDocumentsToDb(docs);
}

export async function getDocumentsForBookingFromDb(bookingId: string): Promise<BookingDocument[]> {
  return listBookingDocumentsFromDb({ bookingId, limit: 100 });
}

function normEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function findBookingForPublicUpload(opts: {
  propertyId: number;
  email: string;
  bookingId?: string;
}): Promise<Record<string, unknown> | null> {
  const parsed = await findBookingStorageForPublicUpload({
    email: opts.email,
    bookingId: opts.bookingId,
    propertyId: opts.propertyId,
  });
  if (!parsed) return null;
  return parsed as Record<string, unknown>;
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
  const verified = await findBookingStorageForPublicUpload({
    email: opts.email,
    bookingId: opts.bookingId,
  });
  if (!verified || !isBookingStatusEligibleForDocumentUpload(verified.status)) {
    return { ok: false, error: 'BOOKING_NOT_FOUND' };
  }

  const doc = await getBookingDocumentFromDb(opts.docId);
  if (!doc || doc.bookingId !== opts.bookingId) {
    return { ok: false, error: 'DOCUMENT_NOT_FOUND' };
  }
  if (doc.status === 'APPROVED') return { ok: false, error: 'DOCUMENT_ALREADY_APPROVED' };

  const now = new Date().toISOString();
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
  await upsertBookingDocumentToDb(updated);
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
  const verified = await findBookingStorageForPublicUpload({
    email: opts.email,
    bookingId: opts.bookingId,
  });
  if (!verified || !isBookingStatusEligibleForDocumentUpload(verified.status)) {
    return { ok: false, error: 'BOOKING_NOT_FOUND' };
  }

  const doc = await getBookingDocumentFromDb(opts.docId);
  if (!doc || doc.bookingId !== opts.bookingId) {
    return { ok: false, error: 'DOCUMENT_NOT_FOUND' };
  }

  const now = new Date().toISOString();
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
  await upsertBookingDocumentToDb(updated);
  return { ok: true, document: updated };
}
