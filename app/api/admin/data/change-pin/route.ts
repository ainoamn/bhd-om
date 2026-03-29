import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { changeAdminDataPin, ensureAdminDataPinReady } from '@/lib/server/adminDataPin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureAdminDataPinReady();

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
      const code = result.code;
      return NextResponse.json({ error: 'CHANGE_PIN_FAILED', code }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('admin data change-pin:', e);
    return NextResponse.json({ error: 'CHANGE_PIN_FAILED' }, { status: 500 });
  }
}
