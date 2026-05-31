import { prisma } from '@/lib/prisma';
import { createBookingReceiptInDb } from '@/lib/accounting/data/dbService';
import { findConflictingActiveBooking } from '@/lib/server/bookingDuplicateCheck';
import { extractBookingStorageDenorm } from '@/lib/server/bookingStorageDenorm';
import { generateBhdSerial, isValidBhdSerial } from '@/lib/server/serialNumbers';

export type PersistBookingResult =
  | { ok: true; id: string; bookingSerial?: string }
  | { ok: false; error: string; conflictingBookingId?: string; status: number };

/** حفظ حجز على الخادم — مشترك بين POST /api/bookings وإكمال الدفع */
export async function persistBookingPayload(
  body: Record<string, unknown>
): Promise<PersistBookingResult> {
  const id = typeof body?.id === 'string' ? body.id : null;
  if (!id) {
    return { ok: false, error: 'Missing booking id', status: 400 };
  }

  const year = new Date().getFullYear();
  const needSerial = !body.bookingSerial || !isValidBhdSerial(String(body.bookingSerial));
  const payload: Record<string, unknown> = needSerial
    ? { ...body, bookingSerial: await generateBhdSerial('BKG', { year }) }
    : body;

  const allRows = await prisma.bookingStorage.findMany({ select: { bookingId: true, data: true } });
  const conflict = findConflictingActiveBooking(payload, allRows);
  if (conflict) {
    return {
      ok: false,
      error: 'DUPLICATE_ACTIVE_BOOKING',
      conflictingBookingId: conflict.conflictingBookingId,
      status: 409,
    };
  }

  const data = JSON.stringify(payload);
  const denorm = extractBookingStorageDenorm(payload);
  await prisma.bookingStorage.upsert({
    where: { bookingId: id },
    create: { bookingId: id, data, ...denorm },
    update: { data, updatedAt: new Date(), ...denorm },
  });

  if (payload.paymentConfirmed && Number(payload.priceAtBooking) > 0 && payload.type === 'BOOKING') {
    try {
      await createBookingReceiptInDb({
        id: String(payload.id),
        propertyId: Number(payload.propertyId),
        unitKey: typeof payload.unitKey === 'string' ? payload.unitKey : undefined,
        propertyTitleAr: typeof payload.propertyTitleAr === 'string' ? payload.propertyTitleAr : undefined,
        propertyTitleEn: typeof payload.propertyTitleEn === 'string' ? payload.propertyTitleEn : undefined,
        name: typeof payload.name === 'string' ? payload.name : '',
        priceAtBooking: Number(payload.priceAtBooking),
        paymentDate: typeof payload.paymentDate === 'string' ? payload.paymentDate : undefined,
        paymentMethod: typeof payload.paymentMethod === 'string' ? payload.paymentMethod : undefined,
        paymentReferenceNo: typeof payload.paymentReferenceNo === 'string' ? payload.paymentReferenceNo : undefined,
        contactId: typeof payload.contactId === 'string' ? payload.contactId : null,
        bankAccountId: typeof payload.bankAccountId === 'string' ? payload.bankAccountId : null,
      });
    } catch (accErr) {
      console.error('Booking receipt (accounting) error:', accErr);
    }
  }

  return {
    ok: true,
    id,
    bookingSerial: typeof payload.bookingSerial === 'string' ? payload.bookingSerial : undefined,
  };
}
