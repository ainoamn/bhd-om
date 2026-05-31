import { prisma } from '@/lib/prisma';
import { parseBookingStorageRow } from '@/lib/server/bookingContractGate';
import { extractBookingStorageDenorm } from '@/lib/server/bookingStorageDenorm';
import type { PaginationParams } from '@/lib/server/pagination';

export type ParsedBookingRow = Record<string, unknown> & {
  id?: string;
  propertyId?: number | string;
  email?: string;
  phone?: string;
  bookingSerial?: string;
};

export type BookingListFilters = {
  propertyId?: number;
  status?: string;
  bookingType?: string;
};

export function parseBookingStorageData(
  row: { bookingId: string; data: string; createdAt: Date }
): ParsedBookingRow | null {
  const parsed = parseBookingStorageRow(row.data);
  if (!parsed) return null;
  if (!parsed.id) parsed.id = row.bookingId;
  return parsed as ParsedBookingRow;
}

function buildWhere(filters?: BookingListFilters) {
  if (!filters) return {};
  const where: {
    propertyId?: number;
    status?: string;
    bookingType?: string;
  } = {};
  if (filters.propertyId != null) where.propertyId = filters.propertyId;
  if (filters.status) where.status = filters.status;
  if (filters.bookingType) where.bookingType = filters.bookingType;
  return where;
}

/** ترحيل تدريجي للحقول المفهرسة من JSON */
export async function backfillBookingStorageDenormBatch(limit = 100): Promise<number> {
  const rows = await prisma.bookingStorage.findMany({
    where: { propertyId: null },
    take: limit,
    orderBy: { updatedAt: 'desc' },
  });
  let updated = 0;
  for (const row of rows) {
    const parsed = parseBookingStorageRow(row.data);
    if (!parsed) continue;
    const denorm = extractBookingStorageDenorm(parsed);
    await prisma.bookingStorage.update({
      where: { bookingId: row.bookingId },
      data: denorm,
    });
    updated++;
  }
  return updated;
}

/** جلب صفوف الحجز — للمسؤول: pagination + فلاتر على DB */
export async function listBookingStorageRows(
  params: PaginationParams & { adminScope?: boolean; filters?: BookingListFilters }
) {
  const where = params.adminScope ? buildWhere(params.filters) : {};

  if (params.adminScope && !params.unlimited) {
    const [total, rows] = await Promise.all([
      prisma.bookingStorage.count({ where }),
      prisma.bookingStorage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: params.offset,
        take: params.limit,
      }),
    ]);
    return { total, rows };
  }

  const rows = await prisma.bookingStorage.findMany({
    where: params.adminScope ? where : undefined,
    orderBy: { createdAt: 'desc' },
  });
  return { total: rows.length, rows };
}
