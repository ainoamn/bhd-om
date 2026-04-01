import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRoles } from '@/lib/auth/guard';

const KEY = 'print_options_settings';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const row = await prisma.appSetting.findUnique({ where: { key: KEY } });
    const value = row?.value ? JSON.parse(row.value) : {};
    return NextResponse.json(value && typeof value === 'object' ? value : {});
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
    const payload = typeof body === 'object' && body !== null ? JSON.stringify(body) : '{}';
    await prisma.appSetting.upsert({
      where: { key: KEY },
      create: { key: KEY, value: payload },
      update: { value: payload },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('print-options settings POST error:', e);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
