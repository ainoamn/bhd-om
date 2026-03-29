import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import { executeResetKeepProperties } from '@/lib/server/dataResetKeepProperties';
import { ensureAdminDataPinReady, verifyAdminDataPin } from '@/lib/server/adminDataPin';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await ensureAdminDataPinReady();

    const body = (await req.json().catch(() => ({}))) as { pin?: string };
    if (!(await verifyAdminDataPin(body.pin))) {
      return NextResponse.json({ error: 'INVALID_PIN' }, { status: 403 });
    }

    const result = await executeResetKeepProperties(prisma);

    return NextResponse.json({
      ok: true,
      adminEmail: result.adminEmail,
      serialNumber: result.serialNumber,
      message: 'Database reset: properties kept, new admin user created.',
    });
  } catch (e) {
    console.error('admin data reset:', e);
    return NextResponse.json({ error: 'RESET_FAILED' }, { status: 500 });
  }
}
