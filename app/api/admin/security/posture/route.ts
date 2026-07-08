import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRoles } from '@/lib/auth/guard';
import { getPaymentGatewayStatus } from '@/lib/server/paymentGateway';
import { isUpstashConfigured } from '@/lib/server/upstashRedis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Check = { ok: boolean; label: string; hint?: string };

function envOk(name: string, minLen = 1): boolean {
  const v = process.env[name]?.trim();
  return Boolean(v && v.length >= minLen);
}

/** GET — ملخص وضع الأمان للإنتاج (ADMIN) */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const forbidden = requireRoles(auth, ['ADMIN', 'SUPER_ADMIN']);
  if (forbidden) return forbidden;

  const isProd = process.env.NODE_ENV === 'production';
  const payment = getPaymentGatewayStatus();

  const checks: Check[] = [
    { ok: envOk('NEXTAUTH_SECRET', 16), label: 'NEXTAUTH_SECRET', hint: 'openssl rand -base64 32' },
    { ok: envOk('DATABASE_URL'), label: 'DATABASE_URL' },
    { ok: envOk('ENCRYPTION_MASTER_KEY', 32), label: 'ENCRYPTION_MASTER_KEY', hint: '32+ chars — مطلوب للتشفير at-rest' },
    { ok: envOk('CRON_SECRET', 16), label: 'CRON_SECRET' },
    { ok: envOk('THAWANI_WEBHOOK_SECRET', 8), label: 'THAWANI_WEBHOOK_SECRET' },
    { ok: envOk('ADMIN_DATA_RESET_PIN', 8), label: 'ADMIN_DATA_RESET_PIN' },
    { ok: payment.nextAuthUrlSet, label: 'NEXTAUTH_URL' },
    { ok: isUpstashConfigured(), label: 'Upstash Redis', hint: 'UPSTASH_REDIS_REST_URL + TOKEN — rate limits موزّعة' },
  ];

  const score = checks.filter((c) => c.ok).length;
  const total = checks.length;

  return NextResponse.json({
    environment: isProd ? 'production' : 'development',
    score,
    total,
    ready: score === total,
    checks,
    encryptionBackfill: 'npm run db:backfill-all-encryption',
    npmAudit: 'npm run security:audit',
    paymentProductionReady: payment.productionReady,
  });
}
