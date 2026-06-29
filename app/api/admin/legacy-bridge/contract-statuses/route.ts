import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { isAdminLikeRole } from '@/lib/auth/roles';
import { loadCanonicalContractStatusesFromNeon } from '@/lib/server/contractLifecycle';

export const dynamic = 'force-dynamic';

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
    const result = await loadCanonicalContractStatusesFromNeon(reconcile);

    return NextResponse.json(
      {
        source: 'neon-postgresql',
        policy: 'server-canonical-lifecycle',
        reconciled: reconcile,
        persisted: result.persisted,
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
