import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRoles } from '@/lib/auth/guard';

const KEY = 'booking_terms_settings';

export async function GET() {
  try {
    const row = await prisma.appSetting.findUnique({ where: { key: KEY } });
    const value = row?.value ? JSON.parse(row.value) : {};
    return NextResponse.json(value && typeof value === 'object' ? value : {});
  } catch (e) {
    console.error('booking-terms GET error:', e);
    return NextResponse.json({}, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const forbidden = requireRoles(auth, ['ADMIN', 'SUPER_ADMIN', 'COMPANY', 'ORG_MANAGER', 'OWNER', 'LANDLORD']);
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
    console.error('booking-terms POST error:', e);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
