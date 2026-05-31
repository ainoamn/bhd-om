import { prisma } from '@/lib/prisma';
import { parseBookingStorageRow } from '@/lib/server/bookingContractGate';
import { extractBookingStorageDenorm } from '@/lib/server/bookingStorageDenorm';

/** يبقي JSON الحجز متزامناً مع ContractStorage للتوافق مع المسارات القديمة */
export async function syncContractIntoBookingStorage(
  bookingId: string,
  contractId: string,
  contractData: Record<string, unknown>,
  status: string
): Promise<void> {
  const existing = await prisma.bookingStorage.findUnique({ where: { bookingId } });
  if (!existing) return;
  const parsed = parseBookingStorageRow(existing.data) || {};
  const now = new Date().toISOString();
  const nextContract = {
    ...contractData,
    id: contractId,
    bookingId,
    status,
    updatedAt: now,
  };
  const merged = {
    ...parsed,
    id: bookingId,
    contractId,
    contractStage: status,
    contractData: nextContract,
    updatedAt: now,
  };
  const denorm = extractBookingStorageDenorm(merged);
  await prisma.bookingStorage.update({
    where: { bookingId },
    data: { data: JSON.stringify(merged), updatedAt: new Date(), ...denorm },
  });
}
