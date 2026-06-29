import 'dotenv/config';
import { prisma } from '../lib/prisma';
import { resolveCanonicalContractLifecycleStatus } from '../lib/server/contractLifecycle';

function str(v: unknown): string {
  return v == null ? '' : String(v);
}

function parseArr(payload: Record<string, unknown>, jsonKey: string): unknown[] {
  const raw = str(payload[jsonKey]);
  if (!raw) return [];
  try {
    const a = JSON.parse(raw);
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

async function main() {
  const [c, a] = await Promise.all([
    prisma.legacyAppKvStore.findUnique({ where: { kvKey: 'bhd_saved_contracts_by_unit' } }),
    prisma.legacyAppKvStore.findUnique({ where: { kvKey: 'bhd_accounting_registry' } }),
  ]);
  const map = JSON.parse(c?.data || '{}') as Record<string, { payload?: Record<string, unknown> }>;
  const reg = JSON.parse(a?.data || '{}');
  const target = 'TC-06-2026-5022';

  for (const [k, e] of Object.entries(map)) {
    const p = e?.payload;
    if (!p || !JSON.stringify(e).includes(target)) continue;
    console.log('\n=== KEY:', k);
    console.log('status:', resolveCanonicalContractLifecycleStatus(p, reg));
    console.log('depositAmount:', p.depositAmount);
    console.log('depositAttachmentRelativePath:', p.depositAttachmentRelativePath);
    console.log('depositAttachmentFileId:', p.depositAttachmentFileId);
    console.log('paymentMethod:', p.paymentMethod);
    const sched = parseArr(p, 'paymentScheduleJson') as Record<string, unknown>[];
    console.log('schedule rows:', sched.length);
    sched.forEach((r, i) => {
      console.log(
        `  [${i}] checkNo=${str(r.checkNo)} path=${str(r.checkAttachmentRelativePath || r.attachmentRelativePath)} name=${str(r.checkAttachmentName)} dataLen=${str(r.checkAttachmentDataUrl).length}`
      );
    });
    console.log('vat:', p.contractSubjectToVat, p.vatPaymentMode);
    const vat = parseArr(p, 'vatChequeScheduleJson');
    console.log('vat rows:', vat.length);
    const ins = parseArr(p, 'insuranceDepositItemsJson') as Record<string, unknown>[];
    console.log('insurance items:', ins.length);
    ins.forEach((it, i) => {
      console.log(`  [${i}] payType=${str(it.payType)} ref=${str(it.reference)} att=${str(it.attachmentName)} path=${str(it.attachmentRelativePath)}`);
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
