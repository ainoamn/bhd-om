import { getPaymentPending, markPaymentPendingStatus } from '@/lib/server/repositories/paymentPendingRepo';
import { persistBookingPayload } from '@/lib/server/persistBooking';
import { verifyThawaniSessionPaid } from '@/lib/server/paymentGateway';

export type CompletePaymentResult =
  | {
      ok: true;
      bookingId: string;
      propertyId: number;
      bookingSerial?: string;
      alreadyCompleted?: boolean;
    }
  | { ok: false; error: string; status: number };

/** إكمال حجز بعد نجاح الدفع (صفحة success أو webhook) */
export async function completePendingPayment(
  sessionId: string,
  opts?: { userId?: string; skipUserCheck?: boolean }
): Promise<CompletePaymentResult> {
  const row = await getPaymentPending(sessionId);
  if (!row) {
    return { ok: false, error: 'PAYMENT_SESSION_NOT_FOUND', status: 404 };
  }

  if (row.status === 'COMPLETED') {
    try {
      const prev = JSON.parse(row.bookingPayload) as Record<string, unknown>;
      return {
        ok: true,
        bookingId: String(prev.id || ''),
        propertyId: Number(prev.propertyId || row.propertyId || 0),
        alreadyCompleted: true,
      };
    } catch {
      return { ok: false, error: 'CORRUPT_PENDING_PAYLOAD', status: 500 };
    }
  }

  if (row.status === 'CANCELLED' || row.status === 'FAILED') {
    return { ok: false, error: 'PAYMENT_NOT_COMPLETED', status: 400 };
  }

  if (!opts?.skipUserCheck && row.userId && opts?.userId && row.userId !== opts.userId) {
    return { ok: false, error: 'FORBIDDEN', status: 403 };
  }

  const paid = await verifyThawaniSessionPaid(sessionId);
  if (!paid) {
    return { ok: false, error: 'PAYMENT_NOT_VERIFIED', status: 402 };
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(row.bookingPayload) as Record<string, unknown>;
  } catch {
    return { ok: false, error: 'CORRUPT_PENDING_PAYLOAD', status: 500 };
  }

  payload.paymentConfirmed = true;
  payload.paymentReferenceNo = sessionId;
  payload.paymentDate = new Date().toISOString();
  payload.paymentMethod = payload.paymentMethod || 'ONLINE';

  const saved = await persistBookingPayload(payload);
  if (!saved.ok) {
    return {
      ok: false,
      error: saved.error,
      status: saved.status,
    };
  }

  await markPaymentPendingStatus(sessionId, 'COMPLETED');

  return {
    ok: true,
    bookingId: saved.id,
    propertyId: Number(payload.propertyId || row.propertyId || 0),
    bookingSerial: saved.bookingSerial,
  };
}
