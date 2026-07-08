/**
 * بوابات الخادم لمسار الحجز → العقد (لا تعتمد على الواجهة فقط).
 */

export { isBookingStatusEligibleForDocumentUpload } from '@/lib/data/bookingUploadEligibility';

export function bookingHasAccountantConfirmation(booking: Record<string, unknown>): boolean {
  const at = booking.accountantConfirmedAt;
  return typeof at === 'string' && at.trim().length > 0;
}

/** يمنع إنشاء/ربط عقد قبل تأكيد المحاسب */
export function assertAccountantConfirmedForContract(booking: Record<string, unknown> | null | undefined): {
  ok: boolean;
  error?: string;
} {
  if (!booking) {
    return { ok: false, error: 'Booking not found' };
  }
  if (!bookingHasAccountantConfirmation(booking)) {
    return {
      ok: false,
      error: 'ACCOUNTANT_CONFIRMATION_REQUIRED',
    };
  }
  return { ok: true };
}

import { deserializeBookingStorageRaw } from '@/lib/server/bookingStorageCrypto';

export function parseBookingStorageRow(data: string): Record<string, unknown> | null {
  try {
    const json = deserializeBookingStorageRaw(data);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}
