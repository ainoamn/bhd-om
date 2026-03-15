/**
 * RBAC للـ API - يتحقق من الصلاحيات قبل تنفيذ العملية
 * يستخدم getToken مع الطلب لقراءة الجلسة من الكوكي في Route Handlers (App Router)
 */

import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { hasPermission, type AccountingPermission, type AccountingRole } from './permissions';
import { getRoleFromUserRole } from './permissions';

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV === 'development' ? 'bhd-dev-secret-not-for-production' : undefined);

/** يحصل على دور المستخدم من الطلب (جلسة JWT من الكوكي أو Header في التطوير) */
export async function getAccountingRoleFromRequest(request: NextRequest): Promise<AccountingRole | undefined> {
  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev) {
    const headerRole = request.headers.get('X-Accounting-Role');
    if (headerRole && ['ACCOUNTANT', 'APPROVER', 'AUDITOR', 'ADMIN'].includes(headerRole)) {
      return headerRole as AccountingRole;
    }
  }
  const token = await getToken({
    req: request,
    secret: NEXTAUTH_SECRET,
  });
  const userRole = token?.role as string | undefined;
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
