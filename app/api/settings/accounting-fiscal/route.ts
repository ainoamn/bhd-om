import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRoles } from '@/lib/auth/guard';
import { getJsonSetting, upsertJsonSetting } from '@/lib/server/repositories/appSettingsRepo';

const KEY = 'accounting_fiscal_settings';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const value = await getJsonSetting<Record<string, unknown>>(KEY, {});
    return NextResponse.json(value);
  } catch (e) {
    console.error('accounting-fiscal GET error:', e);
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
    console.error('accounting-fiscal POST error:', e);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
