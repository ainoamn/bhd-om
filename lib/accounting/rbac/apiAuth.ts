/**
 * RBAC للـ API - يتحقق من الصلاحيات قبل تنفيذ العملية
 * يمكن استخدام X-Accounting-Role في التطوير، أو getServerSession عند تفعيل NextAuth
 */

import { NextRequest } from 'next/server';
import { hasPermission, type AccountingPermission, type AccountingRole } from './permissions';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/** يحصل على دور المستخدم من الطلب (الجلسة في الإنتاج، وHeader مسموح في التطوير فقط) */
export async function getAccountingRoleFromRequest(request: NextRequest): Promise<AccountingRole | undefined> {
  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev) {
    const headerRole = request.headers.get('X-Accounting-Role');
    if (headerRole && ['ACCOUNTANT', 'APPROVER', 'AUDITOR', 'ADMIN'].includes(headerRole)) {
      return headerRole as AccountingRole;
    }
  }
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as { role?: string } | undefined)?.role;
  if (!userRole) return undefined;
  // تحويل دور المستخدم العام إلى دور محاسبي
  const mapped = (await import('./permissions')).getRoleFromUserRole(userRole);
  return mapped;
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
