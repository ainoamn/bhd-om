/**
 * للتحقق فقط: هل NEXTAUTH_SECRET معرّف على السيرفر؟
 * افتح: https://www.bhd-om.com/api/check-env
 * لا يعرض قيمة المفتاح، فقط هل موجود أم لا.
 */
import { NextResponse } from 'next/server';

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
  return NextResponse.json({
    NEXTAUTH_SECRET: hasSecret ? 'معرّف' : 'غير معرّف',
    DATABASE_URL: hasDb ? 'معرّف' : 'غير معرّف',
    hint: !hasSecret
      ? 'أضف NEXTAUTH_SECRET في Vercel → Settings → Environment Variables ثم Redeploy'
      : undefined,
  });
}
