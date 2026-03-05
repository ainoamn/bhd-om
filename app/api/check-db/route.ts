/**
 * التحقق من أن قاعدة البيانات PostgreSQL متصلة وتستجيب.
 * افتح: https://www.bhd-om.com/api/check-db
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      database: 'متصل بنجاح',
      message: 'قاعدة البيانات PostgreSQL تعمل بشكل صحيح.',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        ok: false,
        database: 'غير متصل أو خطأ',
        error: message,
        hint: 'تأكد من تعيين DATABASE_URL في Vercel (رابط Pooled من Neon) ثم Redeploy.',
      },
      { status: 503 }
    );
  }
}
