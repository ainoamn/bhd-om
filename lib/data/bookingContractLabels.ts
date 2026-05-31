/**
 * تسميات مراحل العقد حسب نوع المعاملة (إيجار / بيع / استثمار).
 */

export type ContractKind = 'RENT' | 'SALE' | 'INVESTMENT';

export type ContractStageLike =
  | 'DRAFT'
  | 'ADMIN_APPROVED'
  | 'TENANT_APPROVED'
  | 'LANDLORD_APPROVED'
  | 'APPROVED'
  | 'CANCELLED';

export function resolveContractKind(
  ...sources: Array<ContractKind | string | null | undefined>
): ContractKind {
  for (const s of sources) {
    if (s === 'SALE' || s === 'RENT' || s === 'INVESTMENT') return s;
  }
  return 'RENT';
}

export function getTenantActorLabel(ar: boolean, kind: ContractKind): string {
  if (kind === 'SALE') return ar ? 'المشتري' : 'Buyer';
  if (kind === 'INVESTMENT') return ar ? 'المستثمر' : 'Investor';
  return ar ? 'المستأجر' : 'Tenant';
}

export function getOwnerActorLabel(ar: boolean, kind: ContractKind): string {
  if (kind === 'SALE') return ar ? 'البائع (المالك)' : 'Seller (owner)';
  return ar ? 'المالك' : 'Landlord';
}

export function getWaitingForTenantSignatureLabel(ar: boolean, kind: ContractKind): string {
  if (kind === 'SALE') return ar ? 'بانتظار توقيع المشتري' : 'Waiting for buyer signature';
  if (kind === 'INVESTMENT') return ar ? 'بانتظار توقيع المستثمر' : 'Waiting for investor signature';
  return ar ? 'بانتظار توقيع المستأجر' : 'Waiting for tenant signature';
}

export function getWaitingForOwnerSignatureLabel(ar: boolean, kind: ContractKind): string {
  if (kind === 'SALE') return ar ? 'بانتظار توقيع البائع (المالك)' : 'Waiting for seller (owner) signature';
  return ar ? 'بانتظار توقيع المالك' : 'Waiting for owner signature';
}

export function getActiveContractBookingLabel(ar: boolean, kind: ContractKind): string {
  if (kind === 'SALE') return ar ? 'مباع (عقد نافذ)' : 'Sold (Active contract)';
  if (kind === 'INVESTMENT') return ar ? 'مستثمر (عقد نافذ)' : 'Invested (Active contract)';
  return ar ? 'مؤجر (عقد نافذ)' : 'Rented (Active contract)';
}

export function getContractStageStatusLabel(
  ar: boolean,
  opts: {
    kind: ContractKind;
    displayStage?: ContractStageLike;
    hasContract: boolean;
    allDocsAndChecksApproved?: boolean;
  }
): string {
  const { kind, displayStage, hasContract, allDocsAndChecksApproved = true } = opts;
  if (!hasContract) return ar ? 'عقد قيد الإعداد' : 'Contract in progress';
  if (displayStage === 'APPROVED') return getActiveContractBookingLabel(ar, kind);
  if (displayStage === 'ADMIN_APPROVED') return getWaitingForTenantSignatureLabel(ar, kind);
  if (displayStage === 'TENANT_APPROVED') return getWaitingForOwnerSignatureLabel(ar, kind);
  if (displayStage === 'LANDLORD_APPROVED') {
    if (allDocsAndChecksApproved) {
      return ar ? 'في انتظار الاعتماد النهائي للعقد' : 'Awaiting final contract approval';
    }
    const tenant = getTenantActorLabel(ar, kind);
    return ar
      ? `تم الاعتماد المبدئي — بانتظار ${tenant} لإكمال المستندات`
      : `Preliminarily approved — awaiting ${tenant.toLowerCase()} to complete documents`;
  }
  return ar ? 'عقد مسودة - بانتظار رفع المستندات' : 'Draft - pending document upload';
}

export function getAdminContractListStatusLabel(
  ar: boolean,
  status: ContractStageLike,
  kind: ContractKind
): string {
  const map: Record<ContractStageLike, { ar: string; en: string }> = {
    DRAFT: { ar: 'مسودة - بانتظار رفع المستندات', en: 'Draft - Pending docs' },
    ADMIN_APPROVED: { ar: 'اعتماد مبدئي من الإدارة', en: 'Preliminary admin approval' },
    TENANT_APPROVED:
      kind === 'SALE'
        ? { ar: 'اعتمده المشتري', en: 'Buyer approved' }
        : kind === 'INVESTMENT'
          ? { ar: 'اعتمده المستثمر', en: 'Investor approved' }
          : { ar: 'اعتمده المستأجر', en: 'Tenant approved' },
    LANDLORD_APPROVED:
      kind === 'SALE'
        ? { ar: 'اعتمده البائع (المالك)', en: 'Seller (owner) approved' }
        : { ar: 'اعتمده المالك', en: 'Landlord approved' },
    APPROVED: { ar: 'معتمد - نافذ', en: 'Approved - Active' },
    CANCELLED: { ar: 'مُشطوب', en: 'Cancelled' },
  };
  const entry = map[status];
  return ar ? entry.ar : entry.en;
}

/** أدوار يمكنها الاعتماد النهائي من صفحة مراجعة العقد */
export function isAdminRoleForContractFinalize(role: string | undefined | null): boolean {
  return ['ADMIN', 'SUPER_ADMIN', 'COMPANY', 'ORG_MANAGER'].includes(String(role || ''));
}
