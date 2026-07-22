import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { isAdminLikeRole } from '@/lib/auth/roles';
import {
  operationalRepairNeedsChanges,
  repairLegacyOperationalKv,
} from '@/lib/server/legacyOperationalRepair';

export const dynamic = 'force-dynamic';

function adminAuthFailed(auth: Awaited<ReturnType<typeof requireAuth>>) {
  if (auth instanceof NextResponse) return auth;
  const roleOk = isAdminLikeRole(auth.role) || auth.role === 'ADMIN' || auth.role === 'SUPER_ADMIN';
  if (!roleOk) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}

function parseTarget(req: NextRequest) {
  const building = req.nextUrl.searchParams.get('building') || undefined;
  const unit = req.nextUrl.searchParams.get('unit') || undefined;
  return { building, unit };
}

/** GET — فحص مصالحة تشغيلية (dry-run) */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const denied = adminAuthFailed(auth);
    if (denied) return denied;

    const target = parseTarget(req);
    const report = await repairLegacyOperationalKv({ dryRun: true, ...target });

    return NextResponse.json(
      {
        source: 'neon-postgresql',
        policy: 'server-operational-repair',
        needsChanges: operationalRepairNeedsChanges(report),
        report,
      },
      {
        headers: { 'Cache-Control': 'private, no-store, must-revalidate' },
      }
    );
  } catch (error) {
    console.error('operational-repair GET error', error);
    return NextResponse.json({ error: 'Failed to inspect operational repair' }, { status: 500 });
  }
}

/** POST — تطبيق مصالحة تشغيلية على Neon */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const denied = adminAuthFailed(auth);
    if (denied) return denied;

    const body = (await req.json().catch(() => ({}))) as { building?: string; unit?: string };
    const target = {
      building: body.building || req.nextUrl.searchParams.get('building') || undefined,
      unit: body.unit || req.nextUrl.searchParams.get('unit') || undefined,
    };

    const report = await repairLegacyOperationalKv({ dryRun: false, ...target });

    return NextResponse.json(
      {
        source: 'neon-postgresql',
        policy: 'server-operational-repair',
        needsChanges: operationalRepairNeedsChanges(report),
        report,
      },
      {
        headers: { 'Cache-Control': 'private, no-store, must-revalidate' },
      }
    );
  } catch (error) {
    console.error('operational-repair POST error', error);
    return NextResponse.json({ error: 'Failed to apply operational repair' }, { status: 500 });
  }
}
