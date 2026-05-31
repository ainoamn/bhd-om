/** حقول مفهرسة في BookingDocumentStorage — تُستخرج من JSON عند الحفظ */
export type BookingDocumentStorageDenorm = {
  propertyId: number | null;
  status: string | null;
  docTypeId: string | null;
  isRequired: boolean;
  emailNorm: string | null;
};

export function extractBookingDocumentStorageDenorm(
  payload: Record<string, unknown>
): BookingDocumentStorageDenorm {
  const propertyIdRaw = payload.propertyId;
  const propertyId =
    propertyIdRaw != null && Number.isFinite(Number(propertyIdRaw)) ? Number(propertyIdRaw) : null;
  const status =
    typeof payload.status === 'string' && payload.status.trim() ? payload.status.trim() : null;
  const docTypeId =
    typeof payload.docTypeId === 'string' && payload.docTypeId.trim() ? payload.docTypeId.trim() : null;
  const isRequired = payload.isRequired === true;
  const uploadedBy =
    typeof payload.uploadedBy === 'string' && payload.uploadedBy.trim()
      ? payload.uploadedBy.trim().toLowerCase()
      : null;
  return { propertyId, status, docTypeId, isRequired, emailNorm: uploadedBy };
}
