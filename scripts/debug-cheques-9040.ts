import 'dotenv/config';
import { prisma } from '../lib/prisma';

async function main() {
  const row = await prisma.legacyAppKvStore.findUnique({ where: { kvKey: 'bhd_accounting_registry' } });
  const reg = JSON.parse(row?.data || '{}');
  const uk = 'عقار تجريبي 9040\t500';
  const ch = (reg.cheques || []).filter((c: { unitKey?: string }) => c.unitKey === uk);
  const statuses = new Map<string, number>();
  ch.forEach((c: { status?: string }) => {
    const s = String(c.status || 'none');
    statuses.set(s, (statuses.get(s) || 0) + 1);
  });
  console.log('cheque count', ch.length, 'statuses', Object.fromEntries(statuses));
  ch.slice(0, 3).forEach((c: Record<string, unknown>) =>
    console.log({ status: c.status, chequeNo: c.chequeNo, linkedKey: c.linkedKey })
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
