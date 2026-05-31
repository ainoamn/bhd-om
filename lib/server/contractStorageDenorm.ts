/** حقول مفهرسة في ContractStorage — تُستخرج من JSON عند الحفظ */
export type ContractStorageDenorm = {
  propertyId: number | null;
  status: string | null;
  contractKind: string | null;
  emailNorm: string | null;
};

export function extractContractStorageDenorm(payload: Record<string, unknown>): ContractStorageDenorm {
  const propertyIdRaw = payload.propertyId;
  const propertyId =
    propertyIdRaw != null && Number.isFinite(Number(propertyIdRaw)) ? Number(propertyIdRaw) : null;
  const status = typeof payload.status === 'string' && payload.status.trim() ? payload.status.trim() : null;
  const contractKind =
    typeof payload.contractKind === 'string' && payload.contractKind.trim()
      ? payload.contractKind.trim()
      : typeof payload.kind === 'string' && payload.kind.trim()
        ? payload.kind.trim()
        : null;
  const emailNorm =
    typeof payload.tenantEmail === 'string' && payload.tenantEmail.trim()
      ? payload.tenantEmail.trim().toLowerCase()
      : null;
  return { propertyId, status, contractKind, emailNorm };
}
