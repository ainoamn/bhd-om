import 'dotenv/config';
import { prisma } from '../lib/prisma';

async function main() {
  const row = await prisma.legacyAppKvStore.findUnique({ where: { kvKey: 'bhd_accounting_registry' } });
  const reg = JSON.parse(row?.data || '{}');
  const deps = (reg.deposits || []).filter((d: { unitKey?: string }) =>
    String(d.unitKey || '').includes('9040')
  );
  console.log('deposits for 9040:', deps.length);
  deps.forEach((d: Record<string, unknown>) => {
    console.log({
      unitKey: d.unitKey,
      type: d.type,
      amount: d.amount,
      status: d.status,
      linkedKey: d.linkedKey,
      attachmentRelativePath: d.attachmentRelativePath,
      reference: d.reference,
    });
  });
  const ch = (reg.cheques || []).filter((c: { unitKey?: string }) => String(c.unitKey || '').includes('9040'));
  console.log('cheques for 9040:', ch.length);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
