import { NextRequest, NextResponse } from 'next/server';
import { verifyBearerSecret } from '@/lib/server/bearerAuth';
import { getCronSecret, isProduction } from '@/lib/server/envValidation';
import {
  operationalRepairNeedsChanges,
  repairLegacyOperationalKv,
} from '@/lib/server/legacyOperationalRepair';

export const dynamic = 'force-dynamic';

/** GET — مصالحة تشغيلية مجدولة (Bearer CRON_SECRET) */
export async function GET(req: NextRequest) {
  const secret = isProduction() ? getCronSecret() : (process.env.CRON_SECRET || '').trim();
  if (!secret) {
    return NextResponse.json({ error: 'Cron not configured' }, { status: 503 });
  }
  const authHeader = req.headers.get('authorization');
  if (!verifyBearerSecret(authHeader, secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const dryRun = req.nextUrl.searchParams.get('dryRun') === '1';
    const report = await repairLegacyOperationalKv({ dryRun: dryRun || false });
    const applied = !dryRun && report.persisted;
    return NextResponse.json({
      ok: true,
      dryRun,
      applied,
      needsChanges: operationalRepairNeedsChanges(report),
      report,
    });
  } catch (error) {
    console.error('cron legacy-operational-repair error', error);
    return NextResponse.json({ error: 'Operational repair failed' }, { status: 500 });
  }
}
