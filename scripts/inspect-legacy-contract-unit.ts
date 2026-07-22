import 'dotenv/config';
import { prisma } from '@/lib/prisma';

type SavedContractEntry = {
  payload?: Record<string, unknown>;
  lifecycleStatus?: string;
  updatedAt?: string;
  savedAt?: string;
};

type KvRow = {
  kvKey: string;
  data: string;
  updatedAt: Date;
};

const INSPECT_KV_KEYS = [
  'bhd_saved_contracts_by_unit',
  'bhd_accounting_registry',
  'bhd_managed_units',
  'bhd_contract_renewal_drafts',
  'bhd_tenancy_contract_drafts',
] as const;

function str(v: unknown): string {
  return v == null ? '' : String(v);
}

function unitKey(building: string, unit: string): string {
  return `${building}\t${unit}`;
}

function envSummary() {
  return {
    DATABASE_URL: !!process.env.DATABASE_URL,
    POSTGRES_PRISMA_URL: !!process.env.POSTGRES_PRISMA_URL,
    POSTGRES_URL: !!process.env.POSTGRES_URL,
    NEON_DATABASE_URL: !!process.env.NEON_DATABASE_URL,
  };
}

function rowMap(rows: KvRow[]): Record<string, KvRow> {
  const out: Record<string, KvRow> = {};
  rows.forEach((row) => {
    out[row.kvKey] = row;
  });
  return out;
}

async function loadInspectKvRows(maxAttempts = 3): Promise<KvRow[]> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await prisma.legacyAppKvStore.findMany({
        where: { kvKey: { in: [...INSPECT_KV_KEYS] } },
        select: { kvKey: true, data: true, updatedAt: true },
        orderBy: { kvKey: 'asc' },
      });
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

async function main() {
  const building = process.argv[2] || 'Al Khuwair Plot 410, Building 88';
  const unit = process.argv[3] || '88';
  const agreements = process.argv.slice(4);
  const env = envSummary();

  console.log(
    JSON.stringify(
      {
        target: { building, unit, agreements },
        env,
      },
      null,
      2
    )
  );

  if (!Object.values(env).some(Boolean)) {
    console.error(
      [
        '[inspect-legacy-contract-unit] لا يوجد رابط PostgreSQL محمّل في البيئة الحالية.',
        'ضع واحداً من: DATABASE_URL / POSTGRES_PRISMA_URL / POSTGRES_URL / NEON_DATABASE_URL',
        'ثم أعد التشغيل: npm run db:inspect-legacy-contract-unit',
      ].join('\n')
    );
    return;
  }

  const rows = await loadInspectKvRows();
  const byKey = rowMap(rows);

  const contractsRow = byKey['bhd_saved_contracts_by_unit'];
  const accountingRow = byKey['bhd_accounting_registry'];
  const managedUnitsRow = byKey['bhd_managed_units'];
  const renewalDraftsRow = byKey['bhd_contract_renewal_drafts'];
  const tenancyDraftsRow = byKey['bhd_tenancy_contract_drafts'];

  const savedMap = JSON.parse(contractsRow?.data || '{}') as Record<string, SavedContractEntry>;
  const accounting = JSON.parse(accountingRow?.data || '{}') as Record<string, unknown>;
  const managedUnits = JSON.parse(managedUnitsRow?.data || '[]') as Array<Record<string, unknown>>;
  const renewalDrafts = JSON.parse(renewalDraftsRow?.data || '{}') as Record<string, unknown>;
  const tenancyDrafts = JSON.parse(tenancyDraftsRow?.data || '{}') as Record<string, unknown>;

  const agreementSet = new Set(agreements.filter(Boolean));
  const contractHits = Object.entries(savedMap)
    .filter(([key, entry]) => {
      const payload = entry?.payload || {};
      return (
        key === unitKey(building, unit) ||
        (str(payload.buildingNo) === building && str(payload.flatNo) === unit) ||
        (agreementSet.size > 0 && agreementSet.has(str(payload.agreementNo)))
      );
    })
    .map(([key, entry]) => ({
      key,
      updatedAt: entry.updatedAt,
      savedAt: entry.savedAt,
      lifecycleStatus: entry.lifecycleStatus,
      agreementNo: str(entry.payload?.agreementNo),
      previousAgreementNo: str(entry.payload?.previousAgreementNo),
      buildingNo: str(entry.payload?.buildingNo),
      flatNo: str(entry.payload?.flatNo),
      tenantNameAr: str(entry.payload?.tenantNameAr),
      startDate: str(entry.payload?.startDate),
      endDate: str(entry.payload?.endDate),
      depositAmount: str(entry.payload?.depositAmount),
      depositReceiptRef: str(entry.payload?.depositReceiptRef),
      insuranceDepositItemsLen: Array.isArray(entry.payload?.insuranceDepositItems)
        ? entry.payload?.insuranceDepositItems.length
        : 0,
    }));

  const managedUnitHit = managedUnits.filter(
    (row) => str(row.building) === building && str(row.unit) === unit
  );

  const depositHits = ((accounting.deposits as Array<Record<string, unknown>>) || []).filter(
    (row) =>
      (str(row.building) === building && str(row.unit) === unit) ||
      str(row.unitKey).includes(building) ||
      str(row.linkedKey).includes(`\t${unit}\t`) ||
      str(row.linkedKey).includes(unit)
  );

  const chequeHits = ((accounting.cheques as Array<Record<string, unknown>>) || []).filter(
    (row) =>
      (str(row.building) === building && str(row.unit) === unit) ||
      str(row.unitKey).includes(building) ||
      str(row.linkedKey).includes(`\t${unit}\t`) ||
      str(row.linkedKey).includes(unit)
  );

  const renewalKey = unitKey(building, unit);
  const tenancyKey = unitKey(building, unit);

  console.log(
    JSON.stringify(
      {
        rows: {
          contractsUpdatedAt: contractsRow?.updatedAt?.toISOString(),
          accountingUpdatedAt: accountingRow?.updatedAt?.toISOString(),
          managedUnitsUpdatedAt: managedUnitsRow?.updatedAt?.toISOString(),
          renewalDraftsUpdatedAt: renewalDraftsRow?.updatedAt?.toISOString(),
          tenancyDraftsUpdatedAt: tenancyDraftsRow?.updatedAt?.toISOString(),
        },
        contractHits,
        managedUnitHit,
        renewalDraft: renewalDrafts[renewalKey] || null,
        tenancyDraft: tenancyDrafts[tenancyKey] || null,
        deposits: depositHits,
        cheques: chequeHits.slice(0, 12),
      },
      null,
      2
    )
  );

  await prisma.$disconnect();
}

main().catch(async (error) => {
  const message = str((error as Error)?.message || error);
  console.error('[inspect-legacy-contract-unit] failed');
  if (message.includes('timeout') || message.includes('terminated')) {
    console.error(
      [
        'فشل الاتصال بـ Neon (timeout).',
        'جرّب مجدداً بعد ثوانٍ، أو تحقق من DATABASE_URL والشبكة.',
      ].join('\n')
    );
  }
  console.error(error);
  try {
    await prisma.$disconnect();
  } catch {}
  process.exit(1);
});
