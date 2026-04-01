import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRoles } from '@/lib/auth/guard';
import { getJsonSetting, upsertJsonSetting } from '@/lib/server/repositories/appSettingsRepo';

const KEY = 'bank_accounts_settings';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const value = await getJsonSetting<unknown>(KEY, []);
    return NextResponse.json(Array.isArray(value) ? value : []);
  } catch (e) {
    console.error('bank-accounts settings GET error:', e);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const forbidden = requireRoles(auth, ['ADMIN', 'SUPER_ADMIN', 'COMPANY', 'ORG_MANAGER', 'ACCOUNTANT']);
    if (forbidden) return forbidden;
    const body = await req.json().catch(() => []);
    await upsertJsonSetting(KEY, Array.isArray(body) ? body : []);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('bank-accounts settings POST error:', e);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
