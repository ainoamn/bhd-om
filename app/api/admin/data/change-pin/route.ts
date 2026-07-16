import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import {
  changeAdminDataPin,
  ensureAdminDataPinReady,
  mapAdminDataPinError,
} from '@/lib/server/adminDataPin';
import { getAuthSecret } from '@/lib/server/authSecret';

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

    const body = (await req.json().catch(() => ({}))) as {
      currentPin?: string;
      newPin?: string;
      newPinRepeat?: string;
    };

    const result = await changeAdminDataPin({
      currentPin: String(body.currentPin ?? ''),
      newPin: String(body.newPin ?? ''),
      newPinRepeat: String(body.newPinRepeat ?? ''),
    });

    if (!result.ok) {
      return NextResponse.json({ error: 'CHANGE_PIN_FAILED', code: result.code }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('admin data change-pin:', e);
    const mapped = mapAdminDataPinError(e);
    if (mapped) {
      return NextResponse.json(
        { error: mapped.error, message: mapped.message },
        { status: mapped.status }
      );
    }
    return NextResponse.json({ error: 'CHANGE_PIN_FAILED' }, { status: 500 });
  }
}
