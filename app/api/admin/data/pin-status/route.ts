import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getAdminDataPinStatus, ensureAdminDataPinReady, mapAdminDataPinError } from '@/lib/server/adminDataPin';
import { getAuthSecret } from '@/lib/server/authSecret';

export const dynamic = 'force-dynamic';

/** حالة رمز حماية /admin/data — بدون كشف قيمة الرمز */
export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: getAuthSecret() });
    if (!token || token.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = await getAdminDataPinStatus();
    let seededNow = false;
    if (!status.configured && status.canSeedFromEnv) {
      try {
        await ensureAdminDataPinReady();
        seededNow = true;
      } catch (e) {
        const mapped = mapAdminDataPinError(e);
        return NextResponse.json(
          {
            configured: false,
            canSeedFromEnv: status.canSeedFromEnv,
            error: mapped?.error ?? 'PIN_SEED_FAILED',
            message: mapped?.message ?? (e instanceof Error ? e.message : 'seed failed'),
          },
          { status: mapped?.status ?? 500 }
        );
      }
    }

    const after = seededNow ? await getAdminDataPinStatus() : status;
    return NextResponse.json(
      {
        configured: after.configured,
        canSeedFromEnv: after.canSeedFromEnv,
        seededNow,
        envHint: after.canSeedFromEnv
          ? 'ADMIN_DATA_RESET_PIN is set on the server'
          : 'Set ADMIN_DATA_RESET_PIN (8+ chars) in Vercel, then redeploy',
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (e) {
    console.error('GET /api/admin/data/pin-status', e);
    return NextResponse.json({ error: 'PIN_STATUS_FAILED' }, { status: 500 });
  }
}
