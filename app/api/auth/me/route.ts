import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getAuthSecret } from '@/lib/server/authSecret';
import { SESSION_IDLE_MAX_AGE_SEC } from '@/lib/bhd/session';
import {
  encodeProductSessionToken,
  nextAuthCookieName,
  nextAuthCookieOptions,
} from '@/lib/bhd/nextAuthCookie';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: getAuthSecret() });
  if (!token?.id && !token?.sub) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const now = Math.floor(Date.now() / 1000);
  const last = Number(token.lastActivity || token.iat || 0);
  if (Number.isFinite(last) && last > 0 && now - last > SESSION_IDLE_MAX_AGE_SEC) {
    const res = NextResponse.json({ ok: false, reason: 'idle' }, { status: 401 });
    res.cookies.set(nextAuthCookieName(), '', { ...nextAuthCookieOptions(0), maxAge: 0 });
    return res;
  }

  const jwt = await encodeProductSessionToken({
    id: String(token.id || token.sub),
    email: String(token.email || ''),
    name: String(token.name || ''),
    serialNumber: typeof token.serialNumber === 'string' ? token.serialNumber : undefined,
    role: typeof token.role === 'string' ? token.role : undefined,
    phone: typeof token.phone === 'string' ? token.phone : undefined,
    isSuperAdmin: token.isSuperAdmin === true,
    adminPermissions: typeof token.adminPermissions === 'string' ? token.adminPermissions : undefined,
    organizationId: typeof token.organizationId === 'string' ? token.organizationId : undefined,
    picture: typeof token.picture === 'string' ? token.picture : undefined,
  });

  const identityId =
    (typeof token.bhdSub === 'string' && token.bhdSub) ||
    (typeof token.sub === 'string' && token.sub) ||
    String(token.id || '');

  const res = NextResponse.json({
    ok: true,
    user: {
      id: identityId,
      email: token.email,
      name: token.name,
    },
  });
  res.cookies.set(nextAuthCookieName(), jwt, nextAuthCookieOptions());
  return res;
}
