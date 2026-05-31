/** حقول مفهرسة في BookingCheckStorage — تُستخرج من JSON عند الحفظ */
export type BookingCheckStorageDenorm = {
  propertyId: number | null;
  isApproved: boolean;
  isRejected: boolean;
};

export function extractBookingCheckStorageDenorm(
  payload: Record<string, unknown>,
  propertyId?: number | null
): BookingCheckStorageDenorm {
  const propertyIdRaw = propertyId ?? payload.propertyId;
  const resolvedPropertyId =
    propertyIdRaw != null && Number.isFinite(Number(propertyIdRaw)) ? Number(propertyIdRaw) : null;
  const isApproved = typeof payload.approvedAt === 'string' && !!payload.approvedAt.trim();
  const isRejected = typeof payload.rejectedAt === 'string' && !!payload.rejectedAt.trim();
  return { propertyId: resolvedPropertyId, isApproved, isRejected };
}
