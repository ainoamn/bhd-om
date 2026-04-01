import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRoles } from '@/lib/auth/guard';
import { getJsonSetting, upsertJsonSetting } from '@/lib/server/repositories/appSettingsRepo';

const KEY = 'print_options_settings';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    return NextResponse.json(await getJsonSetting<Record<string, unknown>>(KEY, {}));
  } catch (e) {
    console.error('print-options settings GET error:', e);
    return NextResponse.json({}, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const forbidden = requireRoles(auth, ['ADMIN', 'SUPER_ADMIN', 'COMPANY', 'ORG_MANAGER', 'ACCOUNTANT']);
    if (forbidden) return forbidden;
    const body = await req.json().catch(() => ({}));
    await upsertJsonSetting(KEY, typeof body === 'object' && body !== null ? body : {});
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('print-options settings POST error:', e);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
