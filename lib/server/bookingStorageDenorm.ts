/** حقول مفهرسة في BookingStorage — تُستخرج من JSON عند الحفظ */
export type BookingStorageDenorm = {
  propertyId: number | null;
  status: string | null;
  bookingType: string | null;
  emailNorm: string | null;
};

export function extractBookingStorageDenorm(payload: Record<string, unknown>): BookingStorageDenorm {
  const propertyIdRaw = payload.propertyId;
  const propertyId =
    propertyIdRaw != null && Number.isFinite(Number(propertyIdRaw)) ? Number(propertyIdRaw) : null;
  const status = typeof payload.status === 'string' && payload.status.trim() ? payload.status.trim() : null;
  const bookingType = typeof payload.type === 'string' && payload.type.trim() ? payload.type.trim() : null;
  const emailNorm =
    typeof payload.email === 'string' && payload.email.trim()
      ? payload.email.trim().toLowerCase()
      : null;
  return { propertyId, status, bookingType, emailNorm };
}
