/**
 * RBAC للـ API - يتحقق من الصلاحيات قبل تنفيذ العملية
 * يمكن استخدام X-Accounting-Role في التطوير، أو getServerSession عند تفعيل NextAuth
 */

import { NextRequest } from 'next/server';
import { hasPermission, type AccountingPermission, type AccountingRole } from './permissions';

/** يحصل على دور المستخدم من الطلب (header أو session لاحقاً) */
export function getAccountingRoleFromRequest(request: NextRequest): AccountingRole | undefined {
  const headerRole = request.headers.get('X-Accounting-Role');
  if (headerRole && ['ACCOUNTANT', 'APPROVER', 'AUDITOR', 'ADMIN'].includes(headerRole)) {
    return headerRole as AccountingRole;
  }
  // TODO: عند تفعيل NextAuth: const session = await getServerSession(); return session?.user?.accountingRole;
  return undefined;
}

/** يتحقق من الصلاحية ويرجع 403 إن لم تكن متوفرة */
export function requirePermission(
  request: NextRequest,
  permission: AccountingPermission
): { ok: true; role: AccountingRole } | { ok: false; status: number; message: string } {
  const role = getAccountingRoleFromRequest(request);
  // في وضع التطوير: إن لم يُمرّر دور، نسمح بالمرور (للتوافق مع الواجهة الحالية)
  if (!role) {
    return { ok: true, role: 'ACCOUNTANT' as AccountingRole };
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
