/**
 * التحقق من صحة بيانات الدخول — معطّل في الإنتاج (استخدم /api/login فقط).
 */
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({
    usage: 'Dev only. Use POST /api/login in production.',
    disabledInProduction: true,
  });
}

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(
    { ok: false, error: 'disabled', message: 'Use /api/login. This endpoint is disabled even in development.' },
    { status: 410 }
  );
}
