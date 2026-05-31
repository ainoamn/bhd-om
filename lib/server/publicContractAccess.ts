import { prisma } from '@/lib/prisma';
import { parseBookingStorageRow } from '@/lib/server/bookingContractGate';

const DEEP_LINK_STATUSES = new Set(['PENDING', 'CONFIRMED', 'RENTED']);
const VERIFY_STATUSES = new Set(['PENDING', 'CONFIRMED']);

export function normalizePublicPhone(p: string): string {
  return p.replace(/\D/g, '').replace(/^968/, '').replace(/^0/, '');
}

export function normalizePublicCivilId(c: string): string {
  return c.replace(/\D/g, '').trim();
}

function isEligibleStatus(status: unknown, allowRented: boolean): boolean {
  const s = String(status || '');
  if (allowRented) return DEEP_LINK_STATUSES.has(s);
  return VERIFY_STATUSES.has(s);
}

function rowToBooking(row: { bookingId: string; data: string }): Record<string, unknown> | null {
  const parsed = parseBookingStorageRow(row.data);
  if (!parsed || parsed.type !== 'BOOKING') return null;
  const id = String(parsed.id || row.bookingId || '');
  if (!id) return null;
  return { ...parsed, id };
}

function bookingMatchesIdentity(
  booking: Record<string, unknown>,
  opts: { email?: string; phone?: string; civilId?: string }
): boolean {
  const emailVal = (opts.email || '').trim().toLowerCase();
  const phoneVal = normalizePublicPhone(opts.phone || '');
  const civilIdVal = normalizePublicCivilId(opts.civilId || '');

  if (emailVal.length >= 3 && String(booking.email || '').trim().toLowerCase() === emailVal) return true;
  if (phoneVal.length >= 6 && normalizePublicPhone(String(booking.phone || '')) === phoneVal) return true;
  if (civilIdVal.length >= 4) {
    if (normalizePublicCivilId(String(booking.civilId || '')) === civilIdVal) return true;
    if (normalizePublicCivilId(String(booking.passportNumber || '')) === civilIdVal) return true;
  }
  return false;
}

function passesFilters(
  booking: Record<string, unknown>,
  opts: { propertyId?: number; allowRented: boolean; email?: string; phone?: string; civilId?: string }
): boolean {
  if (!isEligibleStatus(booking.status, opts.allowRented)) return false;
  if (opts.propertyId != null && Number(booking.propertyId) !== opts.propertyId) return false;
  const hasIdentity =
    (opts.email || '').trim().length >= 3 ||
    normalizePublicPhone(opts.phone || '').length >= 6 ||
    normalizePublicCivilId(opts.civilId || '').length >= 4;
  if (hasIdentity && !bookingMatchesIdentity(booking, opts)) return false;
  return true;
}

/** جلب حجوزات لصفحة شروط العقد — بدون مصادقة */
export async function findBookingsForPublicContractAccess(opts: {
  propertyId?: number;
  bookingId?: string;
  email?: string;
  phone?: string;
  civilId?: string;
  allowRented?: boolean;
}): Promise<Record<string, unknown>[]> {
  const allowRented = opts.allowRented ?? !!opts.bookingId;
  const seen = new Set<string>();
  const out: Record<string, unknown>[] = [];

  const push = (booking: Record<string, unknown> | null) => {
    if (!booking) return;
    if (!passesFilters(booking, { ...opts, allowRented })) return;
    const id = String(booking.id || '');
    if (!id || seen.has(id)) return;
    seen.add(id);
    out.push(booking);
  };

  if (opts.bookingId) {
    const row = await prisma.bookingStorage.findUnique({ where: { bookingId: opts.bookingId } });
    if (row) push(rowToBooking(row));
    if (out.length > 0 && !opts.email && !opts.phone && !opts.civilId) return out.slice(0, 1);
  }

  const emailNorm = (opts.email || '').trim().toLowerCase();
  if (emailNorm.length >= 3) {
    const where: { emailNorm: string; propertyId?: number; bookingId?: string } = { emailNorm };
    if (opts.propertyId != null) where.propertyId = opts.propertyId;
    if (opts.bookingId) where.bookingId = opts.bookingId;
    const rows = await prisma.bookingStorage.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });
    for (const row of rows) push(rowToBooking(row));
  }

  if (out.length === 0 || opts.phone || opts.civilId) {
    const fallbackWhere: { propertyId?: number; bookingId?: string } = {};
    if (opts.propertyId != null) fallbackWhere.propertyId = opts.propertyId;
    if (opts.bookingId) fallbackWhere.bookingId = opts.bookingId;
    const rows = await prisma.bookingStorage.findMany({
      where: Object.keys(fallbackWhere).length ? fallbackWhere : undefined,
      orderBy: { updatedAt: 'desc' },
      take: opts.propertyId != null ? 80 : 120,
    });
    for (const row of rows) {
      const booking = rowToBooking(row);
      if (!booking) continue;
      if (!opts.email && !opts.phone && !opts.civilId) continue;
      if (!bookingMatchesIdentity(booking, opts)) continue;
      push(booking);
    }
  }

  return out.slice(0, 15);
}

export async function getPublicBookingReceipt(opts: {
  bookingId: string;
  propertyId?: number;
}): Promise<{
  booking: Record<string, unknown>;
  receipt: Record<string, unknown>;
  contact: Record<string, unknown> | null;
} | null> {
  const bookingId = opts.bookingId.trim();
  if (!bookingId) return null;

  const row = await prisma.bookingStorage.findUnique({ where: { bookingId } });
  if (!row) return null;
  const booking = rowToBooking(row);
  if (!booking) return null;
  if (opts.propertyId != null && Number(booking.propertyId) !== opts.propertyId) return null;

  const ref = `booking:${bookingId}`;
  const receiptRow = await prisma.accountingDocument.findFirst({
    where: {
      reference: ref,
      type: { in: ['RECEIPT', 'DEPOSIT', 'PAYMENT'] },
    },
    orderBy: { date: 'desc' },
  });
  if (!receiptRow) return null;

  const receipt = {
    id: receiptRow.id,
    serialNumber: receiptRow.serialNumber,
    type: receiptRow.type,
    status: receiptRow.status,
    date: receiptRow.date.toISOString().slice(0, 10),
    contactId: receiptRow.contactId,
    bankAccountId: receiptRow.bankAccountId,
    propertyId: receiptRow.propertyId,
    vatRate: receiptRow.vatRate,
    vatAmount: receiptRow.vatAmount,
    totalAmount: receiptRow.totalAmount,
    netAmount: receiptRow.netAmount,
    amount: Number(receiptRow.totalAmount ?? receiptRow.netAmount ?? 0),
    currency: 'OMR',
    descriptionAr: receiptRow.descriptionAr,
    descriptionEn: receiptRow.descriptionEn,
    reference: receiptRow.reference,
    createdAt: receiptRow.createdAt.toISOString(),
    updatedAt: receiptRow.updatedAt.toISOString(),
    bookingId,
  };

  let contact: Record<string, unknown> | null = null;
  if (receiptRow.contactId) {
    const contactRow = await prisma.addressBookContact.findUnique({
      where: { contactId: receiptRow.contactId },
      select: { data: true },
    });
    if (contactRow?.data && typeof contactRow.data === 'object') {
      contact = contactRow.data as Record<string, unknown>;
    }
  }

  return { booking, receipt, contact };
}
