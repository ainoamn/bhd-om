import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { isAdminLikeRole } from '@/lib/auth/roles';
import { prisma } from '@/lib/prisma';
import { reconcileSavedContractsLifecycle } from '@/lib/server/contractLifecycle';

export const dynamic = 'force-dynamic';

const CONTRACTS_KV_KEY = 'bhd_saved_contracts_by_unit';
const ACCOUNTING_KV_KEY = 'bhd_accounting_registry';

/** GET ?reconcile=1 — حالات العقود الرسمية من Neon (مصدر واحد لكل المتصفحات) */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const roleOk = isAdminLikeRole(auth.role) || auth.role === 'ADMIN' || auth.role === 'SUPER_ADMIN';
    if (!roleOk) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const reconcile = req.nextUrl.searchParams.get('reconcile') === '1';

    const [contractsRow, accountingRow] = await Promise.all([
      prisma.legacyAppKvStore.findUnique({ where: { kvKey: CONTRACTS_KV_KEY }, select: { data: true } }),
      prisma.legacyAppKvStore.findUnique({ where: { kvKey: ACCOUNTING_KV_KEY }, select: { data: true } }),
    ]);

    const contractsRaw = contractsRow?.data ?? '{}';
    const accountingRaw = accountingRow?.data ?? '{}';
    const result = reconcileSavedContractsLifecycle(contractsRaw, accountingRaw);

    let persisted = false;
    if (reconcile && result.changed) {
      const updatedJson = JSON.stringify(result.updatedMap);
      await prisma.legacyAppKvStore.upsert({
        where: { kvKey: CONTRACTS_KV_KEY },
        create: {
          kvKey: CONTRACTS_KV_KEY,
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

    return NextResponse.json(
      {
        source: 'neon-postgresql',
        policy: 'server-canonical-lifecycle',
        reconciled: reconcile,
        persisted,
        groupsProcessed: result.groupsProcessed,
        statuses: result.statuses,
        byUnit: result.byUnit,
      },
      {
        headers: { 'Cache-Control': 'private, no-store, must-revalidate' },
      }
    );
  } catch (error) {
    console.error('contract-statuses GET error', error);
    return NextResponse.json({ error: 'Failed to resolve contract statuses' }, { status: 500 });
  }
}
