import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import { executeResetKeepProperties } from '@/lib/server/dataResetKeepProperties';
import { isAdminDataPinConfigured, verifyAdminDataPin } from '@/lib/server/adminDataPin';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAdminDataPinConfigured()) {
      return NextResponse.json(
        { error: 'DATA_RESET_PIN_NOT_CONFIGURED', message: 'Set ADMIN_DATA_RESET_PIN (8+ chars) in environment.' },
        { status: 503 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as { pin?: string };
    if (!verifyAdminDataPin(body.pin)) {
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
