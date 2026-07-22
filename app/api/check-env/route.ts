/**
 * للتحقق فقط: هل المتغيرات الأساسية معرّفة على السيرفر؟
 * في الإنتاج: ADMIN فقط
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPaymentGatewayStatus } from '@/lib/server/paymentGateway';
import { requireAdminForDiagnostics } from '@/lib/server/adminAccess';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const blocked = await requireAdminForDiagnostics(req);
  if (blocked) return blocked;

  const hasSecret = Boolean(
    process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.length > 0
  );
  const hasDb = Boolean(
    process.env.DATABASE_URL &&
      (process.env.DATABASE_URL.startsWith('postgresql://') ||
        process.env.DATABASE_URL.startsWith('postgres://'))
  );
  const hasEncKey = Boolean(process.env.ENCRYPTION_MASTER_KEY?.trim());
  const hasCron = Boolean(process.env.CRON_SECRET?.trim());
  const hasWebhook = Boolean(process.env.THAWANI_WEBHOOK_SECRET?.trim());
  const hasAdminPin = Boolean(process.env.ADMIN_DATA_RESET_PIN?.trim());
  const payment = getPaymentGatewayStatus();

  const hints: string[] = [];
  if (!hasSecret) hints.push('أضف NEXTAUTH_SECRET في Vercel ثم Redeploy');
  if (!hasDb) hints.push('أضف DATABASE_URL (PostgreSQL) ثم Redeploy');
  if (!hasEncKey) hints.push('أضف ENCRYPTION_MASTER_KEY (32+ chars)');
  if (!hasCron) hints.push('أضف CRON_SECRET لـ /api/cron/auto-archive و /api/cron/legacy-operational-repair');
  if (!hasWebhook) hints.push('أضف THAWANI_WEBHOOK_SECRET');
  if (!hasAdminPin) hints.push('أضف ADMIN_DATA_RESET_PIN (8+ chars)');

  return NextResponse.json({
    NEXTAUTH_SECRET: hasSecret ? 'معرّف' : 'غير معرّف',
    DATABASE_URL: hasDb ? 'معرّف' : 'غير معرّف',
    ENCRYPTION_MASTER_KEY: hasEncKey ? 'معرّف' : 'غير معرّف',
    CRON_SECRET: hasCron ? 'معرّف' : 'غير معرّف',
    THAWANI_WEBHOOK_SECRET: hasWebhook ? 'معرّف' : 'غير معرّف',
    ADMIN_DATA_RESET_PIN: hasAdminPin ? 'معرّف' : 'غير معرّف',
    UPSTASH_REDIS: Boolean(process.env.UPSTASH_REDIS_REST_URL?.trim() && process.env.UPSTASH_REDIS_REST_TOKEN?.trim())
      ? 'معرّف'
      : 'غير معرّف (in-memory rate limit)',
    NEXTAUTH_URL: payment.nextAuthUrlSet ? 'معرّف' : 'غير معرّف',
    PAYMENT_PROVIDER: payment.provider,
    THAWANI_PRODUCTION_READY: payment.productionReady ? 'نعم' : 'لا',
    hints: hints.length > 0 ? hints : undefined,
  });
}
