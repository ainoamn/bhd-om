import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRoles } from '@/lib/auth/guard';
import {
  buildTotpUri,
  disableTotp,
  enableTotp,
  generateTotpSecret,
  isTotpEnabled,
} from '@/lib/server/adminTotp';

export const runtime = 'nodejs';

/** GET — حالة 2FA */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const forbidden = requireRoles(auth, ['ADMIN', 'SUPER_ADMIN']);
  if (forbidden) return forbidden;

  const enabled = await isTotpEnabled(auth.userId!);
  return NextResponse.json({ enabled });
}

/** POST — إعداد أو تفعيل 2FA */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const forbidden = requireRoles(auth, ['ADMIN', 'SUPER_ADMIN']);
  if (forbidden) return forbidden;

  const body = await req.json().catch(() => ({}));
  const action = String(body.action || 'setup');

  if (action === 'setup') {
    const secret = generateTotpSecret();
    const email = (auth.token as { email?: string })?.email || 'admin@bhd-om.com';
    return NextResponse.json({
      secret,
      otpauthUrl: buildTotpUri(email, secret),
      message: 'Scan in Google Authenticator then POST action=enable with secret and code',
    });
  }

  if (action === 'enable') {
    const secret = String(body.secret || '').trim();
    const code = String(body.code || '').trim();
    if (!secret || !code) {
      return NextResponse.json({ error: 'secret and code required' }, { status: 400 });
    }
    const ok = await enableTotp(auth.userId!, secret, code);
    if (!ok) return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    return NextResponse.json({ ok: true, enabled: true });
  }

  if (action === 'disable') {
    const code = String(body.code || '').trim();
    if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 });
    const { verifyUserTotp } = await import('@/lib/server/adminTotp');
    const ok = await verifyUserTotp(auth.userId!, code);
    if (!ok) return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    await disableTotp(auth.userId!);
    return NextResponse.json({ ok: true, enabled: false });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
