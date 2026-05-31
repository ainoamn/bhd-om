import { prisma } from '@/lib/prisma';
import type { BookingCheckEntry } from '@/lib/data/bookingChecks';
import { extractBookingCheckStorageDenorm } from '@/lib/server/bookingCheckStorageDenorm';
import { getJsonSetting } from '@/lib/server/repositories/appSettingsRepo';
import type { PaginationParams } from '@/lib/server/pagination';

const LEGACY_KEY = 'booking_checks_settings';

export type BookingCheckListFilters = {
  bookingId?: string;
  propertyId?: number;
  isApproved?: boolean;
  isRejected?: boolean;
};

export type ChecksStoreEntry = { bookingId: string; checks: BookingCheckEntry[] };

function buildWhere(filters?: BookingCheckListFilters) {
  if (!filters) return {};
  const where: {
    bookingId?: string;
    propertyId?: number;
    isApproved?: boolean;
    isRejected?: boolean;
  } = {};
  if (filters.bookingId) where.bookingId = filters.bookingId;
  if (filters.propertyId != null) where.propertyId = filters.propertyId;
  if (filters.isApproved != null) where.isApproved = filters.isApproved;
  if (filters.isRejected != null) where.isRejected = filters.isRejected;
  return where;
}

export function parseBookingCheckStorageData(row: {
  bookingId: string;
  checkTypeId: string;
  data: string;
}): (BookingCheckEntry & { checkTypeId: string }) | null {
  try {
    const parsed = JSON.parse(row.data) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return null;
    if (!parsed.checkTypeId) parsed.checkTypeId = row.checkTypeId;
    return parsed as unknown as BookingCheckEntry & { checkTypeId: string };
  } catch {
    return null;
  }
}

async function resolvePropertyIdForBooking(bookingId: string): Promise<number | null> {
  const row = await prisma.bookingStorage.findUnique({
    where: { bookingId },
    select: { propertyId: true },
  });
  return row?.propertyId ?? null;
}

export async function upsertBookingCheckStorageRow(params: {
  bookingId: string;
  checkTypeId: string;
  payload: Record<string, unknown>;
  propertyId?: number | null;
}): Promise<void> {
  const propertyId =
    params.propertyId !== undefined ? params.propertyId : await resolvePropertyIdForBooking(params.bookingId);
  const denorm = extractBookingCheckStorageDenorm(params.payload, propertyId);
  const data = JSON.stringify(params.payload);
  await prisma.bookingCheckStorage.upsert({
    where: {
      bookingId_checkTypeId: {
        bookingId: params.bookingId,
        checkTypeId: params.checkTypeId,
      },
    },
    create: {
      bookingId: params.bookingId,
      checkTypeId: params.checkTypeId,
      data,
      ...denorm,
    },
    update: { data, updatedAt: new Date(), ...denorm },
  });
}

export async function listBookingCheckStorageRows(
  params: PaginationParams & { filters?: BookingCheckListFilters }
) {
  const where = buildWhere(params.filters);
  if (!params.unlimited) {
    const [total, rows] = await Promise.all([
      prisma.bookingCheckStorage.count({ where }),
      prisma.bookingCheckStorage.findMany({
        where,
        orderBy: [{ bookingId: 'asc' }, { checkTypeId: 'asc' }],
        skip: params.offset,
        take: params.limit,
      }),
    ]);
    return { total, rows };
  }
  const rows = await prisma.bookingCheckStorage.findMany({
    where,
    orderBy: [{ bookingId: 'asc' }, { checkTypeId: 'asc' }],
  });
  return { total: rows.length, rows };
}

function rowsToChecksStoreEntries(
  rows: { bookingId: string; checkTypeId: string; data: string }[]
): ChecksStoreEntry[] {
  const byBooking = new Map<string, BookingCheckEntry[]>();
  for (const row of rows) {
    const check = parseBookingCheckStorageData(row);
    if (!check?.checkTypeId) continue;
    const list = byBooking.get(row.bookingId) ?? [];
    list.push(check);
    byBooking.set(row.bookingId, list);
  }
  return Array.from(byBooking.entries()).map(([bookingId, checks]) => ({ bookingId, checks }));
}

/** ترحيل من AppSetting JSON إلى BookingCheckStorage */
export async function backfillBookingCheckStorageFromAppSettingBatch(limit = 100): Promise<number> {
  const legacy = await getJsonSetting<unknown>(LEGACY_KEY, []);
  if (!Array.isArray(legacy) || legacy.length === 0) return 0;

  let updated = 0;
  for (const item of legacy) {
    if (updated >= limit) break;
    const entry = item as ChecksStoreEntry;
    const bookingId = String(entry?.bookingId || '').trim();
    if (!bookingId || !Array.isArray(entry.checks)) continue;

    for (const check of entry.checks) {
      if (updated >= limit) break;
      const checkTypeId = String(check?.checkTypeId || '').trim();
      if (!checkTypeId) continue;

      const existing = await prisma.bookingCheckStorage.findUnique({
        where: { bookingId_checkTypeId: { bookingId, checkTypeId } },
      });
      if (existing) continue;

      await upsertBookingCheckStorageRow({
        bookingId,
        checkTypeId,
        payload: check as unknown as Record<string, unknown>,
      });
      updated++;
    }
  }
  return updated;
}

/** ترحيل كامل من legacy حتى نفاد البيانات غير المنسوخة */
export async function backfillAllBookingCheckStorageFromLegacy(): Promise<number> {
  let total = 0;
  for (;;) {
    const n = await backfillBookingCheckStorageFromAppSettingBatch(500);
    total += n;
    if (n === 0) break;
  }
  return total;
}

let legacyChecksBackfillDone = false;

export async function ensureBookingCheckStorageBackfilled(): Promise<void> {
  if (legacyChecksBackfillDone) return;
  const count = await prisma.bookingCheckStorage.count();
  if (count === 0) {
    await backfillAllBookingCheckStorageFromLegacy();
  } else {
    await backfillBookingCheckStorageFromAppSettingBatch(500);
  }
  legacyChecksBackfillDone = true;
}

export async function listAllBookingChecksEntriesFromDb(opts?: {
  offset?: number;
  limit?: number;
}): Promise<ChecksStoreEntry[]> {
  await ensureBookingCheckStorageBackfilled();
  const { rows } = await listBookingCheckStorageRows({
    offset: opts?.offset ?? 0,
    limit: opts?.limit ?? 2000,
    unlimited: false,
  });
  return rowsToChecksStoreEntries(rows);
}

export async function getChecksForBookingFromDb(bookingId: string): Promise<BookingCheckEntry[]> {
  await ensureBookingCheckStorageBackfilled();
  const { rows } = await listBookingCheckStorageRows({
    offset: 0,
    limit: 50,
    unlimited: false,
    filters: { bookingId },
  });
  return rows
    .map((row) => parseBookingCheckStorageData(row))
    .filter((c): c is BookingCheckEntry => c !== null);
}

export async function saveChecksForBookingToDb(
  bookingId: string,
  checks: BookingCheckEntry[]
): Promise<void> {
  const checkTypeIds = new Set<string>();
  for (const check of checks) {
    const checkTypeId = String(check?.checkTypeId || '').trim();
    if (!checkTypeId) continue;
    checkTypeIds.add(checkTypeId);
    await upsertBookingCheckStorageRow({
      bookingId,
      checkTypeId,
      payload: check as unknown as Record<string, unknown>,
    });
  }

  const existing = await prisma.bookingCheckStorage.findMany({
    where: { bookingId },
    select: { checkTypeId: true },
  });
  const toDelete = existing.filter((row) => !checkTypeIds.has(row.checkTypeId));
  if (toDelete.length > 0) {
    await prisma.bookingCheckStorage.deleteMany({
      where: {
        bookingId,
        checkTypeId: { in: toDelete.map((r) => r.checkTypeId) },
      },
    });
  }
}

export async function saveAllBookingChecksEntriesToDb(entries: ChecksStoreEntry[]): Promise<void> {
  for (const entry of entries) {
    if (!entry?.bookingId) continue;
    await saveChecksForBookingToDb(entry.bookingId, entry.checks ?? []);
  }
}
