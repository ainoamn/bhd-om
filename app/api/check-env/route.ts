/**
 * للتحقق فقط: هل المتغيرات الأساسية معرّفة على السيرفر؟
 * افتح: https://www.bhd-om.com/api/check-env
 * لا يعرض قيم الأسرار، فقط هل موجودة أم لا.
 */
import { NextResponse } from 'next/server';
import { getPaymentGatewayStatus } from '@/lib/server/paymentGateway';

export const runtime = 'nodejs';

export async function GET() {
  const hasSecret = Boolean(
    process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.length > 0
  );
  const hasDb = Boolean(
    process.env.DATABASE_URL &&
      (process.env.DATABASE_URL.startsWith('postgresql://') ||
        process.env.DATABASE_URL.startsWith('postgres://'))
  );
  const payment = getPaymentGatewayStatus();

  const hints: string[] = [];
  if (!hasSecret) {
    hints.push('أضف NEXTAUTH_SECRET في Vercel → Environment Variables ثم Redeploy');
  }
  if (!hasDb) {
    hints.push('أضف DATABASE_URL (PostgreSQL) ثم Redeploy');
  }
  if (!payment.nextAuthUrlSet) {
    hints.push('أضف NEXTAUTH_URL=https://www.bhd-om.com');
  }
  if (payment.provider === 'mock') {
    hints.push('Thawani غير مفعّل — أضف THAWANI_SECRET_KEY و THAWANI_PUBLISHABLE_KEY للدفع الحقيقي');
  } else if (!payment.productionReady) {
    hints.push('Thawani جزئياً — أكمل THAWANI_WEBHOOK_SECRET وربط webhook في لوحة Thawani');
  }

  return NextResponse.json({
    NEXTAUTH_SECRET: hasSecret ? 'معرّف' : 'غير معرّف',
    DATABASE_URL: hasDb ? 'معرّف' : 'غير معرّف',
    NEXTAUTH_URL: payment.nextAuthUrlSet ? 'معرّف' : 'غير معرّف',
    PAYMENT_PROVIDER: payment.provider,
    THAWANI_PRODUCTION_READY: payment.productionReady ? 'نعم' : 'لا',
    WEBHOOK_URL: payment.webhookUrl || null,
    hints: hints.length > 0 ? hints : undefined,
  });
}
