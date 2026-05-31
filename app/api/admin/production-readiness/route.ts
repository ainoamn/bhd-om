import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRoles } from '@/lib/auth/guard';
import { getPaymentGatewayStatus } from '@/lib/server/paymentGateway';
import { getLegacyBookingSettingsStatus } from '@/lib/server/legacyBookingSettingsCleanup';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function pingDatabase(): Promise<{ ok: boolean; latencyMs?: number; error?: string }> {
  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, latencyMs: Date.now() - started };
  } catch (e) {
    return {
      ok: false,
      latencyMs: Date.now() - started,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/** GET: حالة جاهزية الإنتاج — DB + Thawani + legacy migration */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const forbidden = requireRoles(auth, ['ADMIN', 'SUPER_ADMIN']);
    if (forbidden) return forbidden;

    const [payment, legacy, database] = await Promise.all([
      Promise.resolve(getPaymentGatewayStatus()),
      getLegacyBookingSettingsStatus(),
      pingDatabase(),
    ]);

    const envConfigured =
      Boolean(process.env.NEXTAUTH_SECRET?.trim()) &&
      Boolean(process.env.DATABASE_URL?.trim()) &&
      payment.nextAuthUrlSet;

    return NextResponse.json(
      {
        payment,
        legacy,
        database,
        overall: {
          dbConnected: database.ok,
          paymentProductionReady: payment.productionReady,
          legacyFullyMigrated: legacy.fullyMigrated,
          coreEnvConfigured: envConfigured,
        },
        checklistUrl: '/docs/PRODUCTION-CHECKLIST.md',
        checkEnvPath: '/api/check-env',
        checkDbPath: '/api/check-db',
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (e) {
    console.error('GET /api/admin/production-readiness', e);
    return NextResponse.json({ error: 'Failed to read production readiness' }, { status: 500 });
  }
}
