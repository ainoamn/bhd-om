import 'dotenv/config';
import { prisma } from '../lib/prisma';
import { resolveCanonicalContractLifecycleStatus } from '../lib/server/contractLifecycle';

function str(v: unknown): string {
  return v == null ? '' : String(v);
}

async function main() {
  const [c, a] = await Promise.all([
    prisma.legacyAppKvStore.findUnique({ where: { kvKey: 'bhd_saved_contracts_by_unit' } }),
    prisma.legacyAppKvStore.findUnique({ where: { kvKey: 'bhd_accounting_registry' } }),
  ]);
  const map = JSON.parse(c?.data || '{}') as Record<string, { payload?: Record<string, unknown> }>;
  const reg = JSON.parse(a?.data || '{}');
  const p = Object.values(map).find((e) =>
    String(e?.payload?.agreementNo || '').includes('TC-06-2026-5022')
  )?.payload;
  if (!p) return console.log('not found');
  console.log('municipal', p.municipalFormNo, p.municipalContractNo);
  console.log('propertyDocsComplete', p.propertyDocumentsComplete);
  const docs = JSON.parse(str(p.propertyDocumentsBundleJson) || '[]');
  console.log('doc bundles', Array.isArray(docs) ? docs.length : 0);
  console.log('status NOW', resolveCanonicalContractLifecycleStatus(p, reg));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
