import { prisma } from '@/lib/prisma';
import { parseBookingStorageRow } from '@/lib/server/bookingContractGate';
import { extractContractStorageDenorm } from '@/lib/server/contractStorageDenorm';
import type { PaginationParams } from '@/lib/server/pagination';

export type ParsedContractRow = Record<string, unknown> & {
  id?: string;
  bookingId?: string;
  propertyId?: number;
  status?: string;
};

export type ContractListFilters = {
  propertyId?: number;
  status?: string;
  contractKind?: string;
  bookingId?: string;
};

export function parseContractStorageData(
  row: { contractId: string; data: string; createdAt: Date }
): ParsedContractRow | null {
  try {
    const parsed = JSON.parse(row.data) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return null;
    if (!parsed.id) parsed.id = row.contractId;
    return parsed as ParsedContractRow;
  } catch {
    return null;
  }
}

function buildWhere(filters?: ContractListFilters) {
  if (!filters) return {};
  const where: {
    propertyId?: number;
    status?: string;
    contractKind?: string;
    bookingId?: string;
  } = {};
  if (filters.propertyId != null) where.propertyId = filters.propertyId;
  if (filters.status) where.status = filters.status;
  if (filters.contractKind) where.contractKind = filters.contractKind;
  if (filters.bookingId) where.bookingId = filters.bookingId;
  return where;
}

export async function upsertContractStorageRow(params: {
  contractId: string;
  bookingId: string;
  payload: Record<string, unknown>;
}): Promise<void> {
  const denorm = extractContractStorageDenorm(params.payload);
  const data = JSON.stringify(params.payload);
  await prisma.contractStorage.upsert({
    where: { contractId: params.contractId },
    create: {
      contractId: params.contractId,
      bookingId: params.bookingId,
      data,
      ...denorm,
    },
    update: { data, bookingId: params.bookingId, updatedAt: new Date(), ...denorm },
  });
}

export async function getContractStorageById(contractId: string) {
  return prisma.contractStorage.findUnique({ where: { contractId } });
}

export async function listContractStorageRows(
  params: PaginationParams & { filters?: ContractListFilters }
) {
  const where = buildWhere(params.filters);
  if (!params.unlimited) {
    const [total, rows] = await Promise.all([
      prisma.contractStorage.count({ where }),
      prisma.contractStorage.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: params.offset,
        take: params.limit,
      }),
    ]);
    return { total, rows };
  }
  const rows = await prisma.contractStorage.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
  });
  return { total: rows.length, rows };
}

/** ترحيل العقود المضمّنة في BookingStorage إلى جدول ContractStorage */
export async function backfillContractStorageFromBookingsBatch(limit = 50): Promise<number> {
  const rows = await prisma.bookingStorage.findMany({
    orderBy: { updatedAt: 'desc' },
    take: Math.max(limit * 4, 100),
  });
  let updated = 0;
  for (const row of rows) {
    if (updated >= limit) break;
    const parsed = parseBookingStorageRow(row.data);
    if (!parsed) continue;
    const contractData = (parsed.contractData as Record<string, unknown> | undefined) || null;
    const contractId = String(parsed.contractId || contractData?.id || '').trim();
    if (!contractId || !contractData || !Object.keys(contractData).length) continue;

    const existing = await prisma.contractStorage.findUnique({ where: { contractId } });
    if (existing) continue;

    const bookingId = String(parsed.id || row.bookingId || contractData.bookingId || '').trim();
    if (!bookingId) continue;

    const status = String(parsed.contractStage || contractData.status || 'DRAFT');
    const payload = {
      ...contractData,
      id: contractId,
      bookingId,
      status,
    };
    await upsertContractStorageRow({ contractId, bookingId, payload });
    updated++;
  }
  return updated;
}

/** قائمة من BookingStorage عند غياب ContractStorage (انتقالي) */
export function contractFromBookingJson(booking: Record<string, unknown>) {
  const contractId = String(booking.contractId || booking.id || '');
  const contractData = ((booking.contractData as Record<string, unknown> | undefined) || {}) as Record<
    string,
    unknown
  >;
  if (!contractId) return null;
  if (!Object.keys(contractData).length) return null;
  return {
    ...contractData,
    id: contractId,
    bookingId: String(booking.id || contractData.bookingId || ''),
    status: String(booking.contractStage || contractData.status || 'DRAFT'),
    updatedAt: String(booking.updatedAt || contractData.updatedAt || new Date().toISOString()),
    createdAt: String(booking.createdAt || contractData.createdAt || new Date().toISOString()),
  };
}
