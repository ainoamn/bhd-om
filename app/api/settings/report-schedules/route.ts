import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRoles } from '@/lib/auth/guard';
import { getJsonSetting, upsertJsonSetting } from '@/lib/server/repositories/appSettingsRepo';
import type { ReportSchedule } from '@/lib/data/reportSchedules';

const KEY = 'report_schedules_settings';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const stored = await getJsonSetting<{ schedules?: ReportSchedule[] } | null>(KEY, null);
    return NextResponse.json({ schedules: Array.isArray(stored?.schedules) ? stored!.schedules : [] });
  } catch (e) {
    console.error('report-schedules GET error:', e);
    return NextResponse.json({ schedules: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const forbidden = requireRoles(auth, ['ADMIN', 'SUPER_ADMIN', 'COMPANY', 'ORG_MANAGER']);
    if (forbidden) return forbidden;
    const body = (await req.json().catch(() => null)) as { schedules?: ReportSchedule[] } | null;
    const schedules = Array.isArray(body?.schedules) ? body!.schedules : [];
    await upsertJsonSetting(KEY, { schedules });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('report-schedules POST error:', e);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
