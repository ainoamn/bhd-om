import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import { executeResetKeepProperties } from '@/lib/server/dataResetKeepProperties';
import {
  ensureAdminDataPinReady,
  mapAdminDataPinError,
  verifyAdminDataPin,
} from '@/lib/server/adminDataPin';
import { getAuthSecret } from '@/lib/server/authSecret';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: getAuthSecret() });
    if (!token || token.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Admin session required' },
        { status: 401 }
      );
    }

    try {
      await ensureAdminDataPinReady();
    } catch (e) {
      const mapped = mapAdminDataPinError(e);
      if (mapped) {
        return NextResponse.json(
          { error: mapped.error, message: mapped.message },
          { status: mapped.status }
        );
      }
      throw e;
    }

    const body = (await req.json().catch(() => ({}))) as { pin?: string };
    if (!(await verifyAdminDataPin(body.pin))) {
      return NextResponse.json(
        {
          error: 'INVALID_PIN',
          message: 'Security PIN is incorrect (min 8 characters).',
        },
        { status: 403 }
      );
    }

    const result = await executeResetKeepProperties(prisma);

    return NextResponse.json({
      ok: true,
      adminEmail: result.adminEmail,
      serialNumber: result.serialNumber,
      pinWarning: result.pinWarning,
      message: 'Database reset: properties kept, new admin user created.',
    });
  } catch (e) {
    console.error('admin data reset:', e);
    const mapped = mapAdminDataPinError(e);
    if (mapped) {
      return NextResponse.json(
        { error: mapped.error, message: mapped.message },
        { status: mapped.status }
      );
    }
    return NextResponse.json(
      {
        error: 'RESET_FAILED',
        message: e instanceof Error ? e.message : 'Reset failed',
      },
      { status: 500 }
    );
  }
}
