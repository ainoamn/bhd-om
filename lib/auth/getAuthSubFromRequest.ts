/**
 * يستخرج JWT / معرف المستخدم من طلب API — بدائل الكوكي لـ App Router و Playwright E2E
 */

import { NextRequest } from 'next/server';
import { cookies, headers } from 'next/headers';
import { getToken } from 'next-auth/jwt';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAuthSecret } from '@/lib/server/authSecret';

const SESSION_COOKIE_NAMES = [
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
  '__Host-next-auth.session-token',
];

function getSessionCookie(request: NextRequest): { name: string; value: string } | null {
  for (const name of SESSION_COOKIE_NAMES) {
    const value = request.cookies.get(name)?.value;
    if (value) return { name, value };
  }
  return null;
}

function tokenUserId(token: Awaited<ReturnType<typeof getToken>>): string | null {
  if (!token) return null;
  const t = token as { sub?: string; id?: string };
  const id = String(t.sub || t.id || '').trim();
  return id || null;
}

async function readTokenFromCookieHeader(cookieHeader: string) {
  const reqFromCookie = { headers: new Headers({ cookie: cookieHeader }) } as NextRequest;
  return getToken({ req: reqFromCookie, secret: getAuthSecret() });
}

/** JWT من الطلب — يُستخدم في requireAuth و getAuthSubFromRequest */
export async function getAuthTokenFromRequest(
  req: NextRequest
): Promise<Awaited<ReturnType<typeof getToken>>> {
  try {
    const headerList = await headers();
    const cookieHeader = headerList.get('cookie');
    if (cookieHeader && cookieHeader.length > 0) {
      const tokenFromHeader = await readTokenFromCookieHeader(cookieHeader);
      if (tokenFromHeader) return tokenFromHeader;
    }
  } catch {
    /* خارج سياق الطلب */
  }

  let token = await getToken({ req, secret: getAuthSecret() });
  if (token) return token;

  const fromRequest = getSessionCookie(req);
  if (fromRequest) {
    token = await readTokenFromCookieHeader(`${fromRequest.name}=${fromRequest.value}`);
    if (token) return token;
  }

  const cookieStore = await cookies();
  for (const name of SESSION_COOKIE_NAMES) {
    const sessionCookie = cookieStore.get(name);
    if (sessionCookie?.value) {
      token = await readTokenFromCookieHeader(`${sessionCookie.name}=${sessionCookie.value}`);
      if (token) return token;
    }
  }

  return null;
}

export async function getAuthSubFromRequest(req: NextRequest): Promise<string | null> {
  const token = await getAuthTokenFromRequest(req);
  const fromToken = tokenUserId(token);
  if (fromToken) return fromToken;

  const session = await getServerSession(authOptions);
  const id = (session?.user as { id?: string } | undefined)?.id;
  if (id) return id;

  return null;
}

export { tokenUserId };
