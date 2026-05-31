import type { BookingStatus } from '@/lib/data/bookings';

const ELIGIBLE_UPLOAD_STATUSES: BookingStatus[] = ['CONFIRMED', 'RENTED', 'SOLD'];

export function isBookingStatusEligibleForDocumentUpload(status: unknown): status is BookingStatus {
  return typeof status === 'string' && (ELIGIBLE_UPLOAD_STATUSES as string[]).includes(status);
}
