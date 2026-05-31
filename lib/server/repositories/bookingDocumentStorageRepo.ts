import { prisma } from '@/lib/prisma';
import type { BookingDocument } from '@/lib/data/bookingDocuments';
import { extractBookingDocumentStorageDenorm } from '@/lib/server/bookingDocumentStorageDenorm';
import { getJsonSetting } from '@/lib/server/repositories/appSettingsRepo';
import type { PaginationParams } from '@/lib/server/pagination';

const LEGACY_KEY = 'booking_documents_settings';

export type ParsedBookingDocumentRow = Record<string, unknown> & {
  id?: string;
  bookingId?: string;
  propertyId?: number;
  status?: string;
};

export type BookingDocumentListFilters = {
  bookingId?: string;
  propertyId?: number;
  status?: string;
  docTypeId?: string;
};

export function parseBookingDocumentStorageData(
  row: { documentId: string; data: string }
): ParsedBookingDocumentRow | null {
  try {
    const parsed = JSON.parse(row.data) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return null;
    if (!parsed.id) parsed.id = row.documentId;
    return parsed as ParsedBookingDocumentRow;
  } catch {
    return null;
  }
}

function buildWhere(filters?: BookingDocumentListFilters) {
  if (!filters) return {};
  const where: {
    bookingId?: string;
    propertyId?: number;
    status?: string;
    docTypeId?: string;
  } = {};
  if (filters.bookingId) where.bookingId = filters.bookingId;
  if (filters.propertyId != null) where.propertyId = filters.propertyId;
  if (filters.status) where.status = filters.status;
  if (filters.docTypeId) where.docTypeId = filters.docTypeId;
  return where;
}

export async function upsertBookingDocumentStorageRow(params: {
  documentId: string;
  bookingId: string;
  payload: Record<string, unknown>;
}): Promise<void> {
  const denorm = extractBookingDocumentStorageDenorm(params.payload);
  const data = JSON.stringify(params.payload);
  await prisma.bookingDocumentStorage.upsert({
    where: { documentId: params.documentId },
    create: {
      documentId: params.documentId,
      bookingId: params.bookingId,
      data,
      ...denorm,
    },
    update: { data, bookingId: params.bookingId, updatedAt: new Date(), ...denorm },
  });
}

export async function getBookingDocumentStorageById(documentId: string) {
  return prisma.bookingDocumentStorage.findUnique({ where: { documentId } });
}

export async function listBookingDocumentStorageRows(
  params: PaginationParams & { filters?: BookingDocumentListFilters }
) {
  const where = buildWhere(params.filters);
  if (!params.unlimited) {
    const [total, rows] = await Promise.all([
      prisma.bookingDocumentStorage.count({ where }),
      prisma.bookingDocumentStorage.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: params.offset,
        take: params.limit,
      }),
    ]);
    return { total, rows };
  }
  const rows = await prisma.bookingDocumentStorage.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
  });
  return { total: rows.length, rows };
}

function rowToBookingDocument(row: { documentId: string; data: string }): BookingDocument | null {
  const parsed = parseBookingDocumentStorageData(row);
  if (!parsed?.id) return null;
  return parsed as unknown as BookingDocument;
}

/** ترحيل من AppSetting JSON إلى BookingDocumentStorage */
export async function backfillBookingDocumentStorageFromAppSettingBatch(limit = 100): Promise<number> {
  const legacy = await getJsonSetting<unknown>(LEGACY_KEY, []);
  if (!Array.isArray(legacy) || legacy.length === 0) return 0;

  let updated = 0;
  for (const item of legacy) {
    if (updated >= limit) break;
    const doc = item as BookingDocument;
    const documentId = String(doc?.id || '').trim();
    const bookingId = String(doc?.bookingId || '').trim();
    if (!documentId || !bookingId) continue;

    const existing = await prisma.bookingDocumentStorage.findUnique({ where: { documentId } });
    if (existing) continue;

    await upsertBookingDocumentStorageRow({
      documentId,
      bookingId,
      payload: doc as unknown as Record<string, unknown>,
    });
    updated++;
  }
  return updated;
}

/** ترحيل كامل من legacy حتى نفاد البيانات غير المنسوخة */
export async function backfillAllBookingDocumentStorageFromLegacy(): Promise<number> {
  let total = 0;
  for (;;) {
    const n = await backfillBookingDocumentStorageFromAppSettingBatch(500);
    total += n;
    if (n === 0) break;
  }
  return total;
}

let legacyDocumentsBackfillDone = false;

export async function ensureBookingDocumentStorageBackfilled(): Promise<void> {
  if (legacyDocumentsBackfillDone) return;
  const count = await prisma.bookingDocumentStorage.count();
  if (count === 0) {
    await backfillAllBookingDocumentStorageFromLegacy();
  } else {
    await backfillBookingDocumentStorageFromAppSettingBatch(500);
  }
  legacyDocumentsBackfillDone = true;
}

export async function listBookingDocumentsFromDb(opts?: {
  bookingId?: string;
  offset?: number;
  limit?: number;
}): Promise<BookingDocument[]> {
  await ensureBookingDocumentStorageBackfilled();
  const { rows } = await listBookingDocumentStorageRows({
    offset: opts?.offset ?? 0,
    limit: opts?.limit ?? 500,
    unlimited: false,
    filters: opts?.bookingId ? { bookingId: opts.bookingId } : undefined,
  });
  return rows.map(rowToBookingDocument).filter((d): d is BookingDocument => d !== null);
}

export async function getBookingDocumentFromDb(documentId: string): Promise<BookingDocument | null> {
  await ensureBookingDocumentStorageBackfilled();
  const row = await getBookingDocumentStorageById(documentId);
  if (!row) return null;
  return rowToBookingDocument(row);
}

export async function saveBookingDocumentsToDb(docs: BookingDocument[]): Promise<void> {
  for (const doc of docs) {
    if (!doc?.id || !doc?.bookingId) continue;
    await upsertBookingDocumentStorageRow({
      documentId: doc.id,
      bookingId: doc.bookingId,
      payload: doc as unknown as Record<string, unknown>,
    });
  }
}

export async function upsertBookingDocumentToDb(doc: BookingDocument): Promise<void> {
  await upsertBookingDocumentStorageRow({
    documentId: doc.id,
    bookingId: doc.bookingId,
    payload: doc as unknown as Record<string, unknown>,
  });
}
