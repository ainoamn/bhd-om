import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRoles } from '@/lib/auth/guard';
import { getPaymentGatewayStatus } from '@/lib/server/paymentGateway';
import { getLegacyBookingSettingsStatus } from '@/lib/server/legacyBookingSettingsCleanup';

export const dynamic = 'force-dynamic';

/** GET: حالة جاهزية الإنتاج — Thawani + legacy migration */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const forbidden = requireRoles(auth, ['ADMIN', 'SUPER_ADMIN']);
    if (forbidden) return forbidden;

    const [payment, legacy] = await Promise.all([
      Promise.resolve(getPaymentGatewayStatus()),
      getLegacyBookingSettingsStatus(),
    ]);

    return NextResponse.json(
      {
        payment,
        legacy,
        checklistUrl: '/docs/PRODUCTION-CHECKLIST.md',
        checkEnvPath: '/api/check-env',
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (e) {
    console.error('GET /api/admin/production-readiness', e);
    return NextResponse.json({ error: 'Failed to read production readiness' }, { status: 500 });
  }
}
