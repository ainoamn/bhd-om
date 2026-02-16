/**
 * RBAC - صلاحيات المحاسبة
 * Segregation of Duties - COSO Framework
 */

export type AccountingRole =
  | 'ACCOUNTANT'   // محاسب - إنشاء قيود ومستندات
  | 'APPROVER'     // معتمد - اعتماد القيود
  | 'AUDITOR'      // مراجع - عرض فقط
  | 'ADMIN';       // مدير - كل الصلاحيات + إغلاق الفترات

export type AccountingPermission =
  | 'ACCOUNT_VIEW'
  | 'ACCOUNT_EDIT'
  | 'JOURNAL_CREATE'
  | 'JOURNAL_APPROVE'
  | 'JOURNAL_CANCEL'
  | 'DOCUMENT_CREATE'
  | 'PERIOD_LOCK'
  | 'REPORT_VIEW'
  | 'AUDIT_VIEW';

const ROLE_PERMISSIONS: Record<AccountingRole, AccountingPermission[]> = {
  ACCOUNTANT: [
    'ACCOUNT_VIEW',
    'JOURNAL_CREATE',
    'DOCUMENT_CREATE',
    'REPORT_VIEW',
  ],
  APPROVER: [
    'ACCOUNT_VIEW',
    'JOURNAL_CREATE',
    'JOURNAL_APPROVE',
    'JOURNAL_CANCEL',
    'DOCUMENT_CREATE',
    'REPORT_VIEW',
  ],
  AUDITOR: [
    'ACCOUNT_VIEW',
    'REPORT_VIEW',
    'AUDIT_VIEW',
  ],
  ADMIN: [
    'ACCOUNT_VIEW',
    'ACCOUNT_EDIT',
    'JOURNAL_CREATE',
    'JOURNAL_APPROVE',
    'JOURNAL_CANCEL',
    'DOCUMENT_CREATE',
    'PERIOD_LOCK',
    'REPORT_VIEW',
    'AUDIT_VIEW',
  ],
};

export function hasPermission(
  role: AccountingRole | string | undefined,
  permission: AccountingPermission
): boolean {
  if (!role) return false;
  const perms = ROLE_PERMISSIONS[role as AccountingRole];
  if (!perms) return false;
  return perms.includes(permission);
}

export function getRoleFromUserRole(userRole: string): AccountingRole {
  if (userRole === 'ADMIN' || userRole === 'OWNER') return 'ADMIN';
  return 'ACCOUNTANT'; // default for CLIENT
}
