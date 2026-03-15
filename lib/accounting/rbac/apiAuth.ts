/**
 * RBAC للـ API - يتحقق من الصلاحيات قبل تنفيذ العملية
 * يقرأ الجلسة من الكوكي بعدة طرق لضمان العمل في الإنتاج (App Router / Vercel)
 */

import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { getToken } from 'next-auth/jwt';
import { hasPermission, type AccountingPermission, type AccountingRole } from './permissions';
import { getRoleFromUserRole } from './permissions';

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV === 'development' ? 'bhd-dev-secret-not-for-production' : undefined);

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

/** يحصل على دور المستخدم من الطلب (جلسة JWT من الكوكي أو Header في التطوير) */
export async function getAccountingRoleFromRequest(request: NextRequest): Promise<AccountingRole | undefined> {
  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev) {
    const headerRole = request.headers.get('X-Accounting-Role');
    if (headerRole && ['ACCOUNTANT', 'APPROVER', 'AUDITOR', 'ADMIN'].includes(headerRole)) {
      return headerRole as AccountingRole;
    }
  }

  let token = await getToken({
    req: request,
    secret: NEXTAUTH_SECRET,
  });

  if (!token) {
    const fromRequest = getSessionCookie(request);
    if (fromRequest) {
      const reqWithCookie = {
        headers: new Headers({ cookie: `${fromRequest.name}=${fromRequest.value}` }),
      } as NextRequest;
      token = await getToken({ req: reqWithCookie, secret: NEXTAUTH_SECRET });
    }
  }

  if (!token) {
    const cookieStore = await cookies();
    for (const name of SESSION_COOKIE_NAMES) {
      const sessionCookie = cookieStore.get(name);
      if (sessionCookie?.value) {
        const cookieHeader = `${sessionCookie.name}=${sessionCookie.value}`;
        const reqWithCookie = { headers: new Headers({ cookie: cookieHeader }) } as NextRequest;
        token = await getToken({ req: reqWithCookie, secret: NEXTAUTH_SECRET });
        if (token) break;
      }
    }
  }

  if (!token) return undefined;
  const userRole = (token.role as string | undefined) ?? (token.sub ? 'ACCOUNTANT' : undefined);
  if (!userRole) return undefined;
  return getRoleFromUserRole(userRole);
}

/** يتحقق من الصلاحية ويرجع 403 إن لم تكن متوفرة */
export async function requirePermission(
  request: NextRequest,
  permission: AccountingPermission
): Promise<{ ok: true; role: AccountingRole } | { ok: false; status: number; message: string }> {
  const role = await getAccountingRoleFromRequest(request);
  if (!role) {
    return {
      ok: false,
      status: 401,
      message: 'Unauthorized: accounting role is required',
    };
  }
  if (hasPermission(role, permission)) {
    return { ok: true, role };
  }
  return {
    ok: false,
    status: 403,
    message: `Permission denied: ${permission} required`,
  };
}
