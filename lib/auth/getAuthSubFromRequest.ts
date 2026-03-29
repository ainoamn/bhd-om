/**
 * يستخرج معرف المستخدم (sub) من طلب API — بنفس بدائل الكوكي المستخدمة في المحاسبة
 * حتى يعمل getToken عندما يفشل الاستدعاء المباشر مع NextRequest في App Router.
 */

import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { getToken } from 'next-auth/jwt';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const NEXTAUTH_SECRET =
  process.env.NEXTAUTH_SECRET ||
  (process.env.NODE_ENV === 'development' ? 'bhd-dev-secret-not-for-production' : undefined);

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

export async function getAuthSubFromRequest(req: NextRequest): Promise<string | null> {
  let token = await getToken({
    req,
    secret: NEXTAUTH_SECRET,
  });
  if (token?.sub) return token.sub as string;

  const fromRequest = getSessionCookie(req);
  if (fromRequest) {
    const reqWithCookie = {
      headers: new Headers({ cookie: `${fromRequest.name}=${fromRequest.value}` }),
    } as NextRequest;
    token = await getToken({ req: reqWithCookie, secret: NEXTAUTH_SECRET });
    if (token?.sub) return token.sub as string;
  }

  const cookieStore = await cookies();
  for (const name of SESSION_COOKIE_NAMES) {
    const sessionCookie = cookieStore.get(name);
    if (sessionCookie?.value) {
      const cookieHeader = `${sessionCookie.name}=${sessionCookie.value}`;
      const reqWithCookie = { headers: new Headers({ cookie: cookieHeader }) } as NextRequest;
      token = await getToken({ req: reqWithCookie, secret: NEXTAUTH_SECRET });
      if (token?.sub) return token.sub as string;
    }
  }

  const session = await getServerSession(authOptions);
  const id = (session?.user as { id?: string } | undefined)?.id;
  if (id) return id;

  return null;
}
