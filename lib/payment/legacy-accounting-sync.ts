/**
 * مزامنة مدفوعات البوابة مع محاسبة Legacy (bhd_accounting_registry)
 */
import { putLegacyKvBulk, invalidateLegacyKvBulkCache } from '@/lib/server/legacyKvStore';
import { getLegacyKvBulk } from '@/lib/server/legacyKvStore';
import type { PaymentProvider } from './manager';

const REGISTRY_KEY = 'bhd_accounting_registry';

type LegacyRegistry = {
  version?: number;
  entries?: LegacyIncomeEntry[];
  journals?: unknown[];
  _journalLedgerDirty?: boolean;
  journalLedgerVersion?: number;
  [key: string]: unknown;
};

type LegacyIncomeEntry = {
  id: string;
  linkedKey: string;
  type: 'income';
  title: string;
  amount: number;
  dueDate: string;
  status: 'confirmed';
  voucherNo: string;
  partyName?: string;
  coaAccountId: string;
  paymentProvider?: string;
  paymentReference?: string;
  approvedAt: string;
  approvedByName: string;
  createdAt: string;
  updatedAt: string;
};

export async function syncPaymentToLegacyAccounting(input: {
  provider: PaymentProvider;
  reference: string;
  serialNumber: string;
  amount: number;
  description?: string;
  customerName?: string;
  paidAt?: Date;
}): Promise<{ synced: boolean; duplicate?: boolean }> {
  try {
    const bulk = await getLegacyKvBulk('bhd_', [REGISTRY_KEY]);
    const raw = bulk[REGISTRY_KEY];
    const reg: LegacyRegistry = raw ? JSON.parse(raw) : { version: 4, entries: [], journals: [] };
    if (!Array.isArray(reg.entries)) reg.entries = [];

    const linkedKey = `payment|portal|${input.reference}`;
    const existing = reg.entries.find((e) => e.linkedKey === linkedKey);
    if (existing) {
      return { synced: true, duplicate: true };
    }

    const paidAt = input.paidAt || new Date();
    const dateStr = paidAt.toISOString().slice(0, 10);
    const entry: LegacyIncomeEntry = {
      id: `ent_pay_${input.serialNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
      linkedKey,
      type: 'income',
      title: input.description || `دفع إلكتروني — ${input.provider}`,
      amount: input.amount,
      dueDate: dateStr,
      status: 'confirmed',
      voucherNo: input.serialNumber,
      partyName: input.customerName || 'مستأجر — بوابة الدفع',
      coaAccountId: 'coa_411',
      paymentProvider: input.provider,
      paymentReference: input.reference,
      approvedAt: paidAt.toISOString(),
      approvedByName: 'SYSTEM — Payment Gateway',
      createdAt: paidAt.toISOString(),
      updatedAt: paidAt.toISOString(),
    };

    reg.entries.push(entry);
    reg._journalLedgerDirty = true;

    await putLegacyKvBulk({ [REGISTRY_KEY]: JSON.stringify(reg) });
    invalidateLegacyKvBulkCache();
    return { synced: true };
  } catch (error) {
    console.error('[LegacyAccountingSync] Error:', error);
    return { synced: false };
  }
}
