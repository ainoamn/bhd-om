import { mergeContractPayloads } from '@/lib/server/legacyKvMerge';

export type ContractLifecycleStatus =
  | 'active_pending'
  | 'active_docs_pending'
  | 'active_accounting_pending'
  | 'active'
  | 'draft'
  | 'renewal_pending'
  | 'cancellation_pending'
  | 'cancelled';

type SavedContractEntry = {
  payload?: Record<string, unknown>;
  lifecycleStatus?: string;
  savedAt?: string;
  updatedAt?: string;
  lastActorUserId?: string;
  lastActorName?: string;
};

type AccountingRegistry = {
  deposits?: Array<Record<string, unknown>>;
  cheques?: Array<Record<string, unknown>>;
};

const MANDATORY_DOC_CATEGORIES = [
  'contract',
  'municipal',
  'identity',
  'cards',
  'cheques',
  'receipts',
  'insurance',
  'declaration',
];

const COMBINED_DOC_KEY = 'all_documents';

function str(v: unknown): string {
  return v == null ? '' : String(v);
}

function normalizeUnit(unit: unknown): string {
  return str(unit).trim();
}

function normalizeBuilding(building: unknown): string {
  return str(building).trim();
}

function unitKey(building: unknown, unit: unknown): string {
  return `${normalizeBuilding(building)}\t${normalizeUnit(unit)}`;
}

function parseObject(raw: string): Record<string, SavedContractEntry> {
  try {
    const v = JSON.parse(raw || '{}');
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, SavedContractEntry>) : {};
  } catch {
    return {};
  }
}

function parseAccounting(raw: string): AccountingRegistry {
  try {
    const v = JSON.parse(raw || '{}');
    return v && typeof v === 'object' ? (v as AccountingRegistry) : {};
  } catch {
    return {};
  }
}

function parsePayloadJsonArray(payload: Record<string, unknown>, jsonKey: string, arrayKey: string): unknown[] {
  const direct = payload[arrayKey];
  if (Array.isArray(direct) && direct.length) return direct;
  const raw = str(payload[jsonKey]);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function attachmentPresent(att: Record<string, unknown> | null | undefined): boolean {
  if (!att || typeof att !== 'object') return false;
  if (str(att.relativePath) || str(att.fileId) || str(att.attachmentRelativePath)) return true;
  if (str(att.checkAttachmentRelativePath) || str(att.checkAttachmentFileId)) return true;
  const dataUrl = str(att.dataUrl) || str(att.attachmentDataUrl) || str(att.checkAttachmentDataUrl);
  return dataUrl.length > 80;
}

function embeddedDataUrlPresent(...vals: unknown[]): boolean {
  return vals.some((v) => {
    const s = str(v);
    return s.length > 80 && s.startsWith('data:');
  });
}

function payloadHasDepositAttachment(payload: Record<string, unknown>): boolean {
  if (str(payload.depositAttachmentName).trim()) return true;
  if (embeddedDataUrlPresent(payload.depositAttachmentDataUrl)) return true;
  if (str(payload.depositAttachmentRelativePath).trim() || str(payload.depositAttachmentFileId).trim()) return true;
  return false;
}

function getLinkedUnits(payload: Record<string, unknown>): Array<Record<string, unknown>> {
  if (Array.isArray(payload.linkedContractUnits) && payload.linkedContractUnits.length) {
    return payload.linkedContractUnits as Array<Record<string, unknown>>;
  }
  try {
    const arr = JSON.parse(str(payload.linkedContractUnitsJson) || '[]');
    return Array.isArray(arr) ? (arr as Array<Record<string, unknown>>) : [];
  } catch {
    return [];
  }
}

function resolvePrimaryUnit(
  building: unknown,
  unit: unknown,
  payload: Record<string, unknown>
): { building: string; unit: string } {
  const linked = getLinkedUnits(payload);
  const b = normalizeBuilding(payload.buildingNo || building);
  if (linked.length > 1) {
    const u = normalizeUnit(linked[0]?.unit || payload.flatNo || unit);
    return { building: b, unit: u };
  }
  return { building: b || normalizeBuilding(building), unit: normalizeUnit(unit || payload.flatNo) };
}

function isPaymentMethodCheque(pm: unknown): boolean {
  const p = str(pm).toLowerCase();
  return p.includes('شيك') || p.includes('chq') || p.includes('cheq');
}

function isAccountingDepositPendingReceipt(status: unknown): boolean {
  return str(status) === 'pending_receipt';
}

function isAccountingDepositHeldStatus(status: unknown): boolean {
  const s = str(status);
  return s === 'held' || s === 'released' || s === 'refunded';
}

function isAccountingDepositReceiptConfirmed(dep: Record<string, unknown> | null | undefined): boolean {
  if (!dep) return false;
  return isAccountingDepositHeldStatus(dep.status) || !!dep.receiptApprovedAt;
}

function depositAttachmentFromAccounting(dep: Record<string, unknown>): Record<string, unknown> | null {
  const fields = {
    depositAttachmentName: str(dep.attachmentName),
    depositAttachmentRelativePath: str(dep.attachmentRelativePath),
    depositAttachmentFileId: str(dep.attachmentFileId),
    depositStoredOnDisk: !!dep.storedOnDisk,
    depositAttachmentDataUrl: '',
  };
  return payloadHasDepositAttachment(fields) ? fields : null;
}

function getSecurityDeposit(
  reg: AccountingRegistry,
  building: string,
  unit: string
): Record<string, unknown> | null {
  const uk = unitKey(building, unit);
  return (reg.deposits || []).find((d) => str(d.unitKey) === uk && str(d.type) === 'security') || null;
}

function enrichPayloadDepositFromAccounting(
  payload: Record<string, unknown>,
  reg: AccountingRegistry
): Record<string, unknown> {
  const primary = resolvePrimaryUnit(payload.buildingNo, payload.flatNo, payload);
  const b = primary.building;
  const u = primary.unit;
  if (!b || !u) return { ...payload };
  const out: Record<string, unknown> = { ...payload, buildingNo: b, flatNo: u };
  const dep = getSecurityDeposit(reg, b, u);
  if (dep) {
    if (str(dep.reference) && !str(out.depositReceiptRef).trim()) {
      out.depositReceiptRef = str(dep.reference);
    }
    if (!payloadHasDepositAttachment(out)) {
      const att = depositAttachmentFromAccounting(dep);
      if (att) Object.assign(out, att);
    }
  }
  return out;
}

function payloadDepositSatisfiedByAccounting(
  payload: Record<string, unknown>,
  reg: AccountingRegistry
): boolean {
  const amt = parseFloat(str(payload.depositAmount)) || 0;
  if (amt <= 0) return true;
  const primary = resolvePrimaryUnit(payload.buildingNo, payload.flatNo, payload);
  const dep = getSecurityDeposit(reg, primary.building, primary.unit);
  if (dep && isAccountingDepositReceiptConfirmed(dep)) return true;
  if (str(payload.depositReceiptRef).trim() && payloadHasDepositAttachment(payload)) return true;
  if (payloadHasDepositAttachment(payload) && dep) return true;
  if (!dep) return false;
  if (isAccountingDepositPendingReceipt(dep.status)) {
    if (str(dep.reference).trim() && parseFloat(str(dep.amount)) > 0) return true;
    return (
      payloadHasDepositAttachment(payload) ||
      !!(str(dep.attachmentRelativePath).trim() || str(dep.attachmentName).trim())
    );
  }
  return false;
}

function paymentScheduleRowHasGap(row: Record<string, unknown>, isCheque: boolean): boolean {
  if (isCheque) {
    return (
      !str(row.checkNo).trim() ||
      !(
        str(row.checkAttachmentName).trim() ||
        embeddedDataUrlPresent(row.checkAttachmentDataUrl, row.attachmentDataUrl, row.dataUrl) ||
        str(row.checkAttachmentRelativePath || row.attachmentRelativePath).trim()
      )
    );
  }
  return !str(row.dueDate).trim() || !str(row.amount).trim();
}

function vatChequeRowHasGap(row: Record<string, unknown>): boolean {
  return (
    !str(row.checkNo).trim() ||
    !(
      str(row.checkAttachmentName).trim() ||
      embeddedDataUrlPresent(row.checkAttachmentDataUrl, row.attachmentDataUrl, row.dataUrl) ||
      str(row.checkAttachmentRelativePath || row.attachmentRelativePath).trim()
    )
  );
}

function insuranceDepositItemHasGap(it: Record<string, unknown>): boolean {
  const pt = str(it.payType);
  if (pt !== 'cheque' && pt !== 'cheque_group') return false;
  return (
    !str(it.reference).trim() ||
    !(
      str(it.attachmentName).trim() ||
      embeddedDataUrlPresent(it.attachmentDataUrl) ||
      str(it.attachmentRelativePath).trim()
    )
  );
}

function contractFinancialPayloadNeedsAdditionalData(
  payload: Record<string, unknown>,
  reg: AccountingRegistry
): boolean {
  const p = enrichPayloadDepositFromAccounting(payload, reg);
  const depositAmt = parseFloat(str(p.depositAmount)) || 0;
  if (depositAmt > 0 && !payloadHasDepositAttachment(p) && !payloadDepositSatisfiedByAccounting(p, reg)) {
    return true;
  }
  const pm = str(payload.paymentMethod).trim();
  const byChq = isPaymentMethodCheque(payload.paymentMethod);
  if (pm) {
    const schedule = parsePayloadJsonArray(payload, 'paymentScheduleJson', 'paymentSchedule');
    if (!schedule.length) return true;
    if (schedule.some((r) => paymentScheduleRowHasGap(r as Record<string, unknown>, byChq))) return true;
  }
  if (str(payload.contractSubjectToVat) === 'yes' && str(payload.vatPaymentMode) === 'separate') {
    const vatSchedule = parsePayloadJsonArray(payload, 'vatChequeScheduleJson', 'vatChequeSchedule');
    const count = Math.max(1, parseInt(str(payload.vatChequeCount), 10) || 1);
    if (vatSchedule.length < count) return true;
    if (vatSchedule.some((r) => vatChequeRowHasGap(r as Record<string, unknown>))) return true;
  }
  const insItems = parsePayloadJsonArray(payload, 'insuranceDepositItemsJson', 'insuranceDepositItems');
  if (insItems.some((it) => insuranceDepositItemHasGap(it as Record<string, unknown>))) return true;
  return false;
}

function parsePropertyDocumentsBundle(payload: Record<string, unknown>): Array<Record<string, unknown>> {
  return parsePayloadJsonArray(payload, 'propertyDocumentsBundleJson', 'propertyDocumentsBundle') as Array<
    Record<string, unknown>
  >;
}

function hasPropertyDocumentCombinedBundle(docs: Array<Record<string, unknown>>): boolean {
  return docs.some((d) => attachmentPresent(d) && str(d.category) === COMBINED_DOC_KEY);
}

function contractPropertyDocumentsComplete(payload: Record<string, unknown>): boolean {
  if (payload.propertyDocumentsComplete === true || str(payload.propertyDocumentsComplete) === 'true') {
    const docs = parsePropertyDocumentsBundle(payload);
    if (hasPropertyDocumentCombinedBundle(docs)) return true;
    if (docs.some((d) => attachmentPresent(d))) return true;
    if (str(payload.propertyDocumentsCompletedAt)) return true;
  }
  const docs = parsePropertyDocumentsBundle(payload);
  if (hasPropertyDocumentCombinedBundle(docs)) return true;
  const uploaded = new Set<string>();
  docs.forEach((d) => {
    if (attachmentPresent(d)) uploaded.add(str(d.category));
  });
  return MANDATORY_DOC_CATEGORIES.every((k) => uploaded.has(k));
}

function contractMunicipalDataComplete(payload: Record<string, unknown>): boolean {
  return !!(str(payload.municipalFormNo).trim() && str(payload.municipalContractNo).trim());
}

function contractActivationRequirementsComplete(payload: Record<string, unknown>): boolean {
  return contractMunicipalDataComplete(payload) && contractPropertyDocumentsComplete(payload);
}

function accountingDepositLinkedKey(building: string, unit: string, suffix: string): string {
  return `${normalizeBuilding(building)}\t${normalizeUnit(unit)}\t${suffix}`;
}

function contractDepositAccountingApprovalsComplete(
  building: string,
  unit: string,
  payload: Record<string, unknown>,
  reg: AccountingRegistry
): boolean {
  const primary = resolvePrimaryUnit(building, unit, payload);
  const b = primary.building;
  const u = primary.unit;
  if (!b || !u) return true;
  const uk = unitKey(b, u);
  const deposits = (reg.deposits || []).filter((d) => str(d.unitKey) === uk);
  const relevantKeys = new Set<string>();
  const depositAmount = parseFloat(str(payload.depositAmount)) || 0;
  if (depositAmount > 0) relevantKeys.add(accountingDepositLinkedKey(b, u, 'security'));
  const insRows = parsePayloadJsonArray(payload, 'insuranceDepositItemsJson', 'insuranceDepositItems');
  insRows.forEach((row, i) => {
    const amt = parseFloat(str((row as Record<string, unknown>).amount)) || 0;
    if (amt <= 0) return;
    const itemId = str((row as Record<string, unknown>).id || (row as Record<string, unknown>).rowId || i + 1);
    relevantKeys.add(accountingDepositLinkedKey(b, u, `ins_${itemId}`));
  });
  if (!relevantKeys.size) return true;
  const relevant = deposits.filter((d) => relevantKeys.has(str(d.linkedKey)));
  if (relevant.some((d) => isAccountingDepositPendingReceipt(d.status))) return false;
  if (relevant.some((d) => str(d.status) === 'receipt_rejected')) return false;
  for (const key of relevantKeys) {
    const dep = deposits.find((d) => str(d.linkedKey) === key);
    if (!dep || !isAccountingDepositHeldStatus(dep.status)) return false;
  }
  return true;
}

function contractAccountingApprovalsComplete(
  building: string,
  unit: string,
  payload: Record<string, unknown>,
  reg: AccountingRegistry
): boolean {
  if (!contractDepositAccountingApprovalsComplete(building, unit, payload, reg)) return false;
  const primary = resolvePrimaryUnit(building, unit, payload);
  const b = primary.building;
  const u = primary.unit;
  if (!b || !u) return true;
  const unitKeys = new Set<string>();
  unitKeys.add(unitKey(b, u));
  getLinkedUnits(payload).forEach((lu) => {
    const lb = normalizeBuilding(lu.building || b);
    const luUnit = normalizeUnit(lu.unit);
    if (luUnit) unitKeys.add(unitKey(lb, luUnit));
  });
  const cheques = (reg.cheques || []).filter((c) => unitKeys.has(str(c.unitKey)));
  if (cheques.some((c) => isAccountingDepositPendingReceipt(c.status))) return false;
  if (cheques.some((c) => str(c.status) === 'receipt_rejected')) return false;
  return true;
}

/** الحالة الرسمية — تُحسب من Neon فقط (مصدر واحد لكل المتصفحات) */
export function resolveCanonicalContractLifecycleStatus(
  payload: Record<string, unknown>,
  reg: AccountingRegistry
): ContractLifecycleStatus {
  if (!payload || typeof payload !== 'object') return 'active_pending';
  const lifecyclePayload = enrichPayloadDepositFromAccounting(payload, reg);
  if (contractFinancialPayloadNeedsAdditionalData(lifecyclePayload, reg)) return 'active_pending';
  if (!contractActivationRequirementsComplete(lifecyclePayload)) return 'active_docs_pending';
  const primary = resolvePrimaryUnit(payload.buildingNo, payload.flatNo, payload);
  if (
    primary.building &&
    primary.unit &&
    !contractAccountingApprovalsComplete(primary.building, primary.unit, lifecyclePayload, reg)
  ) {
    return 'active_accounting_pending';
  }
  return 'active';
}

function agreementGroupKey(building: unknown, agreementNo: unknown): string {
  return `${normalizeBuilding(building)}\t${str(agreementNo).trim()}`;
}

export type ContractStatusMaps = {
  statuses: Record<string, ContractLifecycleStatus>;
  byUnit: Record<string, ContractLifecycleStatus>;
};

export type ReconcileContractsResult = ContractStatusMaps & {
  updatedMap: Record<string, SavedContractEntry>;
  changed: boolean;
  groupsProcessed: number;
};

/** جلب وحساب حالات العقود من Neon — مع خيار الحفظ */
export async function loadCanonicalContractStatusesFromNeon(
  persist: boolean
): Promise<ContractStatusMaps & { persisted: boolean; groupsProcessed: number }> {
  const { prisma } = await import('@/lib/prisma');
  const [contractsRow, accountingRow] = await Promise.all([
    prisma.legacyAppKvStore.findUnique({
      where: { kvKey: 'bhd_saved_contracts_by_unit' },
      select: { data: true },
    }),
    prisma.legacyAppKvStore.findUnique({
      where: { kvKey: 'bhd_accounting_registry' },
      select: { data: true },
    }),
  ]);

  const contractsRaw = contractsRow?.data ?? '{}';
  const accountingRaw = accountingRow?.data ?? '{}';
  const result = reconcileSavedContractsLifecycle(contractsRaw, accountingRaw);

  let persisted = false;
  if (persist && result.changed) {
    const updatedJson = JSON.stringify(result.updatedMap);
    await prisma.legacyAppKvStore.upsert({
      where: { kvKey: 'bhd_saved_contracts_by_unit' },
      create: {
        kvKey: 'bhd_saved_contracts_by_unit',
        data: updatedJson,
        category: 'contracts',
      },
      update: {
        data: updatedJson,
        category: 'contracts',
        updatedAt: new Date(),
      },
    });
    persisted = true;
  }

  return {
    statuses: result.statuses,
    byUnit: result.byUnit,
    persisted,
    groupsProcessed: result.groupsProcessed,
  };
}

/** توحيد العقود في KV: دمج أغنى payload + lifecycle واحد لكل اتفاقية */
export function reconcileSavedContractsLifecycle(
  contractsRaw: string,
  accountingRaw: string
): ReconcileContractsResult {
  const map = parseObject(contractsRaw);
  const reg = parseAccounting(accountingRaw);
  const statuses: Record<string, ContractLifecycleStatus> = {};
  const byUnit: Record<string, ContractLifecycleStatus> = {};
  const groups = new Map<string, { keys: string[]; payloads: Record<string, unknown>[] }>();

  Object.entries(map).forEach(([storageKey, entry]) => {
    const payload = entry?.payload;
    if (!payload || typeof payload !== 'object') return;
    const ag = str(payload.agreementNo).trim();
    const b = payload.buildingNo;
    const gk = ag ? agreementGroupKey(b, ag) : `__unit__\t${storageKey}`;
    if (!groups.has(gk)) groups.set(gk, { keys: [], payloads: [] });
    const g = groups.get(gk)!;
    g.keys.push(storageKey);
    g.payloads.push(payload);
  });

  let changed = false;
  const now = new Date().toISOString();

  groups.forEach((group, gk) => {
    let mergedPayload: Record<string, unknown> = {};
    group.payloads.forEach((p) => {
      mergedPayload = mergeContractPayloads(mergedPayload, p);
    });
    if (!Object.keys(mergedPayload).length) return;

    const status = resolveCanonicalContractLifecycleStatus(mergedPayload, reg);
    if (gk.startsWith('__unit__\t')) {
      const storageKey = gk.slice('__unit__\t'.length);
      const entry = map[storageKey];
      if (!entry) return;
      const tab = storageKey.indexOf('\t');
      const b = tab >= 0 ? storageKey.slice(0, tab) : str(mergedPayload.buildingNo);
      const u = tab >= 0 ? storageKey.slice(tab + 1) : str(mergedPayload.flatNo);
      byUnit[unitKey(b, u)] = status;
      const ag = str(mergedPayload.agreementNo).trim();
      if (ag) statuses[agreementGroupKey(b, ag)] = status;
      const nextPayload = { ...mergedPayload, contractSavedStatus: status };
      if (str(entry.lifecycleStatus) !== status || str(entry.payload?.contractSavedStatus) !== status) {
        changed = true;
      }
      map[storageKey] = {
        ...entry,
        payload: nextPayload,
        lifecycleStatus: status,
        updatedAt: now,
      };
      return;
    }

    statuses[gk] = status;
    const linked = getLinkedUnits(mergedPayload);
    const primary = resolvePrimaryUnit(mergedPayload.buildingNo, mergedPayload.flatNo, mergedPayload);

    group.keys.forEach((storageKey) => {
      const entry = map[storageKey];
      if (!entry) return;
      const tab = storageKey.indexOf('\t');
      const u = tab >= 0 ? storageKey.slice(tab + 1) : str(entry.payload?.flatNo);
      const b = tab >= 0 ? storageKey.slice(0, tab) : str(entry.payload?.buildingNo);
      byUnit[unitKey(b, u)] = status;

      const unitSlice =
        linked.length > 1 ? linked.find((lu) => normalizeUnit(lu.unit) === normalizeUnit(u)) : null;
      const nextPayload: Record<string, unknown> = {
        ...mergedPayload,
        flatNo: normalizeUnit(u),
        contractSavedStatus: status,
        contractSavedAt: str(mergedPayload.contractSavedAt) || str(entry.savedAt) || now,
      };
      if (unitSlice && typeof unitSlice === 'object') {
        if (unitSlice.floorDetails != null) nextPayload.floorDetails = unitSlice.floorDetails;
        if (unitSlice.unitType != null) nextPayload.unitType = unitSlice.unitType;
        if (unitSlice.monthlyRent != null) nextPayload.monthlyRent = unitSlice.monthlyRent;
        if (unitSlice.electricityMeter != null) nextPayload.electricityMeter = unitSlice.electricityMeter;
        if (unitSlice.waterMeter != null) nextPayload.waterMeter = unitSlice.waterMeter;
      }
      if (linked.length > 1) {
        nextPayload.linkedContractUnits = linked;
        nextPayload.linkedContractUnitsJson = JSON.stringify(linked);
      }

      if (
        str(entry.lifecycleStatus) !== status ||
        str(entry.payload?.contractSavedStatus) !== status ||
        JSON.stringify(entry.payload) !== JSON.stringify(nextPayload)
      ) {
        changed = true;
      }
      map[storageKey] = {
        ...entry,
        payload: nextPayload,
        lifecycleStatus: status,
        updatedAt: now,
      };
    });

    if (linked.length > 1) {
      byUnit[unitKey(primary.building, primary.unit)] = status;
    }
  });

  return {
    statuses,
    byUnit,
    updatedMap: map,
    changed,
    groupsProcessed: groups.size,
  };
}
