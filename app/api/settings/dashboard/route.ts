/**
 * إعدادات لوحات التحكم: قراءة/كتابة من قاعدة البيانات حتى تنعكس على لوحة العميل في أي متصفح.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getJsonSetting, upsertJsonSetting } from '@/lib/server/repositories/appSettingsRepo';

const KEY = 'dashboard_settings';

export async function GET() {
  try {
    return NextResponse.json(await getJsonSetting<Record<string, string[]>>(KEY, {}));
  } catch (e) {
    console.error('Dashboard settings get error:', e);
    return NextResponse.json({}, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || (token.role as string) !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    await upsertJsonSetting(KEY, typeof body === 'object' && body !== null ? body : {});
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Dashboard settings save error:', e);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
