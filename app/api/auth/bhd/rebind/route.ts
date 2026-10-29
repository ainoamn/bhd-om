import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import { getAuthSecret } from '@/lib/server/authSecret';
import { identityIssuer, isSafeNextPath, type IdentityProfile } from '@/lib/bhd/identity';
import { identitySessionMaxAgeSecCached } from '@/lib/bhd/runtime';
import {
  encodeProductSessionToken,
  nextAuthCookieName,
  nextAuthCookieOptions,
} from '@/lib/bhd/nextAuthCookie';
import { upsertOfficeUserFromIdentity } from '@/lib/server/bhdOidcUser';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function bindReturnPath(returnTo: string, sub: string) {
  const safe = isSafeNextPath(returnTo) ? returnTo : '/ar/admin';
  try {
    const url = new URL(safe, 'https://bhd.local');
    url.searchParams.set('au', sub);
    url.searchParams.set('_bhd', String(Date.now()));
    return `${url.pathname}${url.search}`;
  } catch {
    return safe;
  }
}

function wantsJson(request: NextRequest) {
  const accept = request.headers.get('accept') || '';
  return accept.includes('application/json');
}

function jsonOk(
  payload: { ok: true; unchanged?: boolean; user: { id: string; email: string; name: string } },
  cookie?: { name: string; value: string; opts: ReturnType<typeof nextAuthCookieOptions> },
) {
  const response = NextResponse.json(payload, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, private', Pragma: 'no-cache' },
  });
  if (cookie) {
    response.cookies.set(cookie.name, cookie.value, cookie.opts);
  }
  return response;
}

async function profileFromWindowToken(token: string): Promise<IdentityProfile> {
  const issuer = identityIssuer();
  const response = await fetch(`${issuer}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`me_${response.status}`);
  const body = (await response.json()) as {
    user?: { id?: string; email?: string; name?: string; picture?: string | null } | null;
  };
  const user = body.user;
  const email = typeof user?.email === 'string' ? user.email.trim().toLowerCase() : '';
  if (!user?.id || !email) throw new Error('claims');
  return {
    sub: user.id,
    email,
    name: typeof user.name === 'string' && user.name.trim() ? user.name.trim() : email.split('@')[0],
    picture: typeof user.picture === 'string' && user.picture.startsWith('https://') ? user.picture : null,
    phone: null,
  };
}

async function rebind(request: NextRequest) {
  const origin = new URL(request.url).origin;
  const json = wantsJson(request);
  let token = '';
  let returnTo = '/ar/admin';

  const contentType = request.headers.get('content-type') || '';
  if (request.method === 'POST' && contentType.includes('application/json')) {
    const json = (await request.json().catch(() => ({}))) as { token?: string; returnTo?: string };
    token = typeof json.token === 'string' ? json.token.trim() : '';
    returnTo = isSafeNextPath(json.returnTo) ? json.returnTo! : returnTo;
  } else if (request.method === 'POST') {
    const form = await request.formData().catch(() => null);
    token = String(form?.get('token') || '').trim();
    const rawReturn = String(form?.get('returnTo') || '');
    returnTo = isSafeNextPath(rawReturn) ? rawReturn : returnTo;
  } else {
    const q = new URL(request.url).searchParams.get('returnTo');
    returnTo = isSafeNextPath(q) ? q! : returnTo;
  }

  const header = request.headers.get('authorization');
  if (!token && header?.toLowerCase().startsWith('bearer ')) token = header.slice(7).trim();
  if (!token || token.length < 20) {
    if (json) return NextResponse.json({ ok: false, error: 'token' }, { status: 401 });
    return NextResponse.redirect(new URL(`/api/auth/bhd/start?returnTo=${encodeURIComponent(returnTo)}`, origin), 303);
  }

  const maxAge = identitySessionMaxAgeSecCached();
  const cookieOpts = nextAuthCookieOptions(maxAge);

  try {
    const profile = await profileFromWindowToken(token);
    const session = await getToken({ req: request, secret: getAuthSecret() });
    let currentBhdSub: string | null = null;
    if (session?.bhdSub && typeof session.bhdSub === 'string') {
      currentBhdSub = session.bhdSub;
    } else if (session?.id) {
      const row = await prisma.user.findUnique({ where: { id: String(session.id) }, select: { bhdSub: true } });
      currentBhdSub = row?.bhdSub ?? null;
    }

    if (currentBhdSub && currentBhdSub === profile.sub && session) {
      const user = await prisma.user.findUnique({ where: { bhdSub: profile.sub } });
      if (user) {
        if (json) {
          return jsonOk({
            ok: true,
            unchanged: true,
            user: { id: profile.sub, email: user.email, name: user.name },
          });
        }
        const jwt = await encodeProductSessionToken({
          id: user.id,
          email: user.email,
          name: user.name,
          serialNumber: user.serialNumber,
          role: user.role,
          phone: user.phone,
          isSuperAdmin: user.isSuperAdmin,
          adminPermissions: user.adminPermissions,
          organizationId: user.organizationId,
          picture: profile.picture,
          bhdSub: profile.sub,
        });
        const response = NextResponse.redirect(new URL(bindReturnPath(returnTo, profile.sub), origin), 303);
        response.cookies.set(nextAuthCookieName(), jwt, cookieOpts);
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        return response;
      }
    }

    const user = await upsertOfficeUserFromIdentity(profile);
    const jwt = await encodeProductSessionToken({
      id: user.id,
      email: user.email,
      name: user.name,
      serialNumber: user.serialNumber,
      role: user.role,
      phone: user.phone,
      isSuperAdmin: user.isSuperAdmin,
      adminPermissions: user.adminPermissions,
      organizationId: user.organizationId,
      picture: profile.picture,
      bhdSub: profile.sub,
    });

    if (json) {
      return jsonOk(
        {
          ok: true,
          user: { id: user.bhdSub || profile.sub, email: user.email, name: user.name },
        },
        { name: nextAuthCookieName(), value: jwt, opts: cookieOpts },
      );
    }
    const response = NextResponse.redirect(new URL(bindReturnPath(returnTo, profile.sub), origin), 303);
    response.cookies.set(nextAuthCookieName(), jwt, cookieOpts);
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;
  } catch {
    if (json) {
      const response = NextResponse.json({ ok: false, error: 'rebind' }, { status: 401 });
      response.cookies.set(nextAuthCookieName(), '', { ...cookieOpts, maxAge: 0 });
      return response;
    }
    const response = NextResponse.redirect(
      new URL(`/api/auth/bhd/logout?continue=${encodeURIComponent(`/api/auth/bhd/start?returnTo=${encodeURIComponent(returnTo)}`)}`, origin),
      303,
    );
    response.cookies.set(nextAuthCookieName(), '', { ...cookieOpts, maxAge: 0 });
    return response;
  }
}

export const POST = rebind;
export const GET = rebind;
