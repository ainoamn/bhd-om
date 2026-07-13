import { parseJson, toStr } from '@/lib/real-estate/kvParse';

export type AccountingRegistry = {
  version?: number;
  accounts: Record<string, Record<string, unknown>>;
  cheques: Record<string, unknown>[];
  entries: Record<string, unknown>[];
  deposits: Record<string, unknown>[];
  invoices?: Record<string, unknown>[];
  bankAccounts?: Record<string, unknown>[];
  chartOfAccounts?: unknown[];
  settings?: Record<string, unknown>;
  branches?: unknown[];
  costCenters?: unknown[];
  projects?: unknown[];
  employees?: unknown[];
  payrollRuns?: unknown[];
  inventoryItems?: unknown[];
  warehouses?: unknown[];
  stockMovements?: unknown[];
  journals?: unknown[];
  journalLedgerVersion?: number;
  openingBalances?: unknown[];
  bankTransfers?: unknown[];
  _journalLedgerDirty?: boolean;
};

function str(v: unknown): string {
  return toStr(v);
}

export function accountingUnitKey(building: string, unit: string): string {
  return `${str(building)}\t${str(unit)}`;
}

function accountingChequeLinkedKey(
  building: string,
  unit: string,
  sourceType: string,
  index: number
): string {
  return `${accountingUnitKey(building, unit)}|${sourceType}|${index || 0}`;
}

function accountingDepositLinkedKey(building: string, unit: string, itemId: string): string {
  return `${accountingUnitKey(building, unit)}|deposit|${itemId}`;
}

function newAccountingId(prefix: string): string {
  return `acct_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function isPaymentMethodCheque(pm: unknown): boolean {
  const p = str(pm).toLowerCase();
  return p.includes('شيك') || p.includes('chq') || p.includes('cheq');
}

function isAccountingChequePaidStatus(status: unknown): boolean {
  const s = str(status);
  return s === 'paid_full' || s === 'paid_partial' || s === 'paid_cash';
}

function isAccountingDepositHeldStatus(status: unknown): boolean {
  return str(status) === 'held';
}

function isAccountingChequePendingReceipt(status: unknown): boolean {
  return str(status) === 'pending_receipt';
}

function parsePayloadSchedule(payload: Record<string, unknown>, jsonKey: string, arrayKey: string): Record<string, unknown>[] {
  const direct = payload[arrayKey];
  if (Array.isArray(direct) && direct.length) {
    return direct.filter((r) => r && typeof r === 'object') as Record<string, unknown>[];
  }
  const raw = str(payload[jsonKey]);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((r) => r && typeof r === 'object') : [];
  } catch {
    return [];
  }
}

function contractRentChequeRowReady(row: Record<string, unknown>): boolean {
  const amount = parseFloat(str(row.amount)) || 0;
  const dueDate = str(row.dueDate || row.paymentDate);
  return amount > 0 && !!dueDate;
}

function normalizeCheque(existing: Record<string, unknown> | undefined, incoming: Record<string, unknown>) {
  if (!existing) {
    return {
      ...incoming,
      originalDueDate: incoming.dueDate,
      actions: [],
      paymentHistory: [],
      deferred: false,
    };
  }
  const keepDue =
    !!existing.deferred ||
    str(existing.status) === 'deferred' ||
    (Array.isArray(existing.actions) &&
      (existing.actions as Record<string, unknown>[]).some(
        (a) => str(a.actionType) === 'defer' || str(a.actionType) === 'reschedule'
      ));
  return {
    ...incoming,
    id: existing.id,
    status: existing.status || incoming.status,
    paidAmount: existing.paidAmount != null ? existing.paidAmount : 0,
    accountantNote: existing.accountantNote || '',
    dueDate: keepDue ? existing.dueDate : incoming.dueDate,
    originalDueDate: existing.originalDueDate || incoming.dueDate,
    deferred: existing.deferred || str(existing.status) === 'deferred',
    tenant: existing.tenant || incoming.tenant,
    agreementNo: existing.agreementNo || incoming.agreementNo,
    actions: Array.isArray(existing.actions) ? existing.actions : [],
    paymentHistory: Array.isArray(existing.paymentHistory) ? existing.paymentHistory : [],
    receiptBankAccountId: existing.receiptBankAccountId || '',
    receiptApprovedAt: existing.receiptApprovedAt,
    receiptApprovedByName: existing.receiptApprovedByName,
  };
}

function recomputeAccountingAccountSummary(reg: AccountingRegistry, unitKey: string): void {
  const cheques = reg.cheques.filter((c) => str(c.unitKey) === unitKey);
  const entries = reg.entries.filter((e) => str(e.unitKey) === unitKey);
  const deposits = reg.deposits.filter((d) => str(d.unitKey) === unitKey);
  let paid = 0;
  let remaining = 0;
  let overdue = 0;
  let claims = 0;

  cheques.forEach((c) => {
    const amt = parseFloat(str(c.amount)) || 0;
    const paidAmt = parseFloat(str(c.paidAmount)) || 0;
    const st = str(c.status) || 'pending';
    if (st === 'pending_receipt' || st === 'receipt_rejected') return;
    if (isAccountingChequePaidStatus(st)) {
      paid += paidAmt > 0 ? paidAmt : amt;
    } else if (st === 'bounced' || st === 'returned') {
      claims += amt;
    } else {
      remaining += Math.max(0, amt - paidAmt);
    }
  });

  entries.forEach((e) => {
    const amt = parseFloat(str(e.amount)) || 0;
    if (str(e.status) === 'confirmed' || str(e.status) === 'invoiced') {
      if (str(e.type) === 'expense' || str(e.type) === 'adjustment_discount') paid -= amt;
      else paid += amt;
    } else if (str(e.status) === 'pending_accountant') {
      remaining += amt;
    }
  });

  const depositsHeld = deposits
    .filter((d) => str(d.status) === 'held')
    .reduce((s, d) => s + (parseFloat(str(d.amount)) || 0), 0);

  const acct = reg.accounts[unitKey] || {};
  reg.accounts[unitKey] = {
    ...acct,
    unitKey,
    paid: parseFloat(paid.toFixed(3)),
    remaining: parseFloat(Math.max(0, remaining).toFixed(3)),
    overdue: parseFloat(Math.max(0, overdue).toFixed(3)),
    claims: parseFloat(Math.max(0, claims).toFixed(3)),
    depositsHeld: parseFloat(depositsHeld.toFixed(3)),
    updatedAt: new Date().toISOString(),
  };
}

function estimateContractTotal(payload: Record<string, unknown>): number {
  const schedule = parsePayloadSchedule(payload, 'paymentScheduleJson', 'paymentSchedule');
  if (schedule.length) {
    return schedule.reduce((s, row) => s + (parseFloat(str(row.amount)) || 0), 0);
  }
  const monthly = parseFloat(str(payload.monthlyRent)) || 0;
  const months = parseInt(str(payload.contractMonths), 10) || 12;
  return parseFloat((monthly * months).toFixed(3));
}

export function ensureAccountingRegistry(raw: string | undefined): AccountingRegistry {
  const parsed = parseJson<Partial<AccountingRegistry>>(raw ?? '{}', {});
  return {
    version: parsed.version ?? 4,
    accounts: parsed.accounts && typeof parsed.accounts === 'object' ? parsed.accounts : {},
    cheques: Array.isArray(parsed.cheques) ? parsed.cheques : [],
    entries: Array.isArray(parsed.entries) ? parsed.entries : [],
    deposits: Array.isArray(parsed.deposits) ? parsed.deposits : [],
    invoices: Array.isArray(parsed.invoices) ? parsed.invoices : [],
    bankAccounts: Array.isArray(parsed.bankAccounts) ? parsed.bankAccounts : [],
    chartOfAccounts: Array.isArray(parsed.chartOfAccounts) ? parsed.chartOfAccounts : [],
    settings: parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : {},
    branches: Array.isArray(parsed.branches) ? parsed.branches : [],
    costCenters: Array.isArray(parsed.costCenters) ? parsed.costCenters : [],
    projects: Array.isArray(parsed.projects) ? parsed.projects : [],
    employees: Array.isArray(parsed.employees) ? parsed.employees : [],
    payrollRuns: Array.isArray(parsed.payrollRuns) ? parsed.payrollRuns : [],
    inventoryItems: Array.isArray(parsed.inventoryItems) ? parsed.inventoryItems : [],
    warehouses: Array.isArray(parsed.warehouses) ? parsed.warehouses : [],
    stockMovements: Array.isArray(parsed.stockMovements) ? parsed.stockMovements : [],
    journals: Array.isArray(parsed.journals) ? parsed.journals : [],
    journalLedgerVersion: parsed.journalLedgerVersion ?? 0,
    openingBalances: Array.isArray(parsed.openingBalances) ? parsed.openingBalances : [],
    bankTransfers: Array.isArray(parsed.bankTransfers) ? parsed.bankTransfers : [],
  };
}

/** Port of legacy syncAccountingFromContractPayload — rent cheques + security deposit + account summary */
export function syncAccountingFromContractPayload(
  building: string,
  unit: string,
  payload: Record<string, unknown>,
  regInput?: AccountingRegistry
): { registry: AccountingRegistry; chequesSynced: number; depositsSynced: number } {
  const b = str(building);
  const u = str(unit);
  if (!b || !u || !payload) {
    return { registry: regInput || ensureAccountingRegistry('{}'), chequesSynced: 0, depositsSynced: 0 };
  }

  const reg = regInput || ensureAccountingRegistry('{}');
  const unitKey = accountingUnitKey(b, u);
  const agreementNo = str(payload.agreementNo);
  const tenant = str(payload.tenantNameAr || payload.tenantNameEn || payload.tenant);

  const existingChequeMap = new Map(reg.cheques.map((c) => [str(c.linkedKey), c]));
  const existingDepositMap = new Map(reg.deposits.map((d) => [str(d.linkedKey), d]));
  const incomingChequeKeys = new Set<string>();
  const incomingDepositKeys = new Set<string>();
  let chequesSynced = 0;
  let depositsSynced = 0;

  const paymentSchedule = parsePayloadSchedule(payload, 'paymentScheduleJson', 'paymentSchedule');
  const byCheque = isPaymentMethodCheque(payload.paymentMethod);

  if (byCheque) {
    paymentSchedule.forEach((row) => {
      const idx = parseInt(str(row.monthIndex), 10) || 0;
      const chequeNo = str(row.checkNo || row.chequeNo).trim();
      const linkedKey = accountingChequeLinkedKey(b, u, 'rent', idx);
      const ready = contractRentChequeRowReady(row);
      const existing = existingChequeMap.get(linkedKey);
      if (!ready) {
        if (existing && isAccountingChequePendingReceipt(existing.status)) {
          existingChequeMap.set(
            linkedKey,
            normalizeCheque(existing, {
              ...existing,
              chequeNo,
              dueDate: str(row.dueDate || row.paymentDate),
              amount: parseFloat(str(row.amount)) || 0,
              status: 'awaiting_contract_data',
              updatedAt: new Date().toISOString(),
            })
          );
          incomingChequeKeys.add(linkedKey);
        }
        return;
      }
      incomingChequeKeys.add(linkedKey);
      const incoming = {
        id: str(existing?.id) || newAccountingId('chq'),
        unitKey,
        building: b,
        unit: u,
        linkedKey,
        sourceType: 'rent',
        chequeNo,
        dueDate: str(row.dueDate || row.paymentDate),
        amount: parseFloat(str(row.amount)) || 0,
        status: 'pending_receipt',
        paidAmount: 0,
        accountantNote: '',
        agreementNo,
        tenant,
        monthIndex: idx,
        updatedAt: new Date().toISOString(),
      };
      existingChequeMap.set(linkedKey, normalizeCheque(existing, incoming));
      chequesSynced += 1;
    });
  }

  const depositAmount = parseFloat(str(payload.depositAmount)) || 0;
  if (depositAmount > 0) {
    const linkedKey = accountingDepositLinkedKey(b, u, 'security');
    incomingDepositKeys.add(linkedKey);
    const existing = existingDepositMap.get(linkedKey);
    let depStatus = str(existing?.status) || 'pending_receipt';
    if (existing && isAccountingDepositHeldStatus(existing.status)) depStatus = str(existing.status);
    existingDepositMap.set(linkedKey, {
      id: str(existing?.id) || newAccountingId('dep'),
      unitKey,
      building: b,
      unit: u,
      linkedKey,
      type: 'security',
      amount: depositAmount,
      reference: str(payload.depositReceiptRef) || str(existing?.reference),
      status: depStatus,
      agreementNo: str(existing?.agreementNo) || agreementNo,
      tenant: str(existing?.tenant) || tenant,
      attachmentName: str(payload.depositAttachmentName) || str(existing?.attachmentName),
      attachmentRelativePath:
        str(payload.depositAttachmentRelativePath) || str(existing?.attachmentRelativePath),
      attachmentFileId: str(payload.depositAttachmentFileId) || str(existing?.attachmentFileId),
      storedOnDisk: payload.depositStoredOnDisk || existing?.storedOnDisk,
      updatedAt: new Date().toISOString(),
    });
    depositsSynced += 1;
  }

  reg.cheques = reg.cheques.filter((c) => {
    if (str(c.unitKey) !== unitKey) return true;
    if (incomingChequeKeys.has(str(c.linkedKey))) return true;
    const st = str(c.status);
    return !isAccountingChequePendingReceipt(st) && st !== 'awaiting_contract_data';
  });
  incomingChequeKeys.forEach((k) => {
    const row = existingChequeMap.get(k);
    if (!row) return;
    const idx = reg.cheques.findIndex((c) => str(c.linkedKey) === k);
    if (idx >= 0) reg.cheques[idx] = row;
    else reg.cheques.push(row);
  });

  reg.deposits = reg.deposits.filter(
    (d) => str(d.unitKey) !== unitKey || incomingDepositKeys.has(str(d.linkedKey))
  );
  incomingDepositKeys.forEach((k) => {
    const row = existingDepositMap.get(k);
    if (!row) return;
    const idx = reg.deposits.findIndex((d) => str(d.linkedKey) === k);
    if (idx >= 0) reg.deposits[idx] = row;
    else reg.deposits.push(row);
  });

  const contractTotal = estimateContractTotal(payload);
  reg.accounts[unitKey] = {
    ...(reg.accounts[unitKey] || {}),
    unitKey,
    building: b,
    unit: u,
    agreementNo,
    tenant,
    contractTotal,
    municipal: parseFloat(str(payload.municipalFees)) || 0,
    depositRefAmount: depositAmount,
    updatedAt: new Date().toISOString(),
  };
  recomputeAccountingAccountSummary(reg, unitKey);
  reg._journalLedgerDirty = true;

  return { registry: reg, chequesSynced, depositsSynced };
}
