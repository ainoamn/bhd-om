import 'dotenv/config';
import { prisma } from '../lib/prisma';
import { reconcileSavedContractsLifecycle } from '../lib/server/contractLifecycle';

async function main() {
  const [contractsRow, accountingRow] = await Promise.all([
    prisma.legacyAppKvStore.findUnique({ where: { kvKey: 'bhd_saved_contracts_by_unit' } }),
    prisma.legacyAppKvStore.findUnique({ where: { kvKey: 'bhd_accounting_registry' } }),
  ]);

  console.log('Neon contracts KV updated:', contractsRow?.updatedAt?.toISOString() ?? 'MISSING');
  console.log('Neon accounting KV updated:', accountingRow?.updatedAt?.toISOString() ?? 'MISSING');

  if (!contractsRow?.data) {
    console.log('NO bhd_saved_contracts_by_unit in Neon');
    return;
  }

  const map = JSON.parse(contractsRow.data) as Record<string, unknown>;
  const target = 'TC-06-2026-5022';
  const hits = Object.entries(map).filter(([, e]) => JSON.stringify(e).includes(target));

  console.log('\nEntries matching', target, ':', hits.length);
  for (const [k, e] of hits) {
    const entry = e as { lifecycleStatus?: string; payload?: { agreementNo?: string; flatNo?: string; contractSavedStatus?: string } };
    console.log('  KEY:', k);
    console.log('    lifecycleStatus:', entry.lifecycleStatus);
    console.log('    contractSavedStatus:', entry.payload?.contractSavedStatus);
    console.log('    flatNo:', entry.payload?.flatNo);
  }

  const result = reconcileSavedContractsLifecycle(contractsRow.data, accountingRow?.data ?? '{}');
  console.log('\nServer canonical reconcile:');
  console.log('  groups:', result.groupsProcessed);
  console.log('  changed:', result.changed);
  for (const [k, st] of Object.entries(result.statuses)) {
    if (k.includes('5022') || k.includes('9040')) console.log('  agreement', k, '=>', st);
  }
  for (const [k, st] of Object.entries(result.byUnit)) {
    if (k.includes('500') || k.includes('501') || k.includes('9040')) console.log('  unit', k, '=>', st);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
