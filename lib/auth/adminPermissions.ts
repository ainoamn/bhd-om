/**
 * صلاحيات الأدمن ونطاق البيانات
 * - أدمن كامل (isSuperAdmin): كل الصلاحيات وكل البيانات
 * - أدمن جزئي: صلاحيات من adminPermissions + كل البيانات المسموح بها
 * - مستخدم عادي: بياناته فقط (أو بيانات شركته إن كان موظفاً)
 */

export const ADMIN_PERMISSIONS = [
  'MANAGE_USERS',
  'MANAGE_PROPERTIES',
  'MANAGE_CONTACTS',
  'MANAGE_BOOKINGS',
  'MANAGE_ACCOUNTING',
  'MANAGE_REPORTS',
  'MANAGE_ANALYTICS',
  'MANAGE_SETTINGS',
  'MANAGE_ORGANIZATIONS',
  'ARCHIVE_RESTORE',
  'FULL_ACCESS',
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export interface SessionUser {
  id?: string;
  email?: string | null;
  role?: string;
  isSuperAdmin?: boolean;
  adminPermissions?: string | string[] | null;
  organizationId?: string | null;
}

export interface DataScope {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  permissions: AdminPermission[];
  userId: string | undefined;
  organizationId: string | null | undefined;
}

function parsePermissions(raw: string | string[] | null | undefined): AdminPermission[] {
  if (!raw) return [];
  const arr = typeof raw === 'string' ? (() => { try { return JSON.parse(raw) as string[]; } catch { return []; } })() : raw;
  return arr.filter((p): p is AdminPermission => ADMIN_PERMISSIONS.includes(p as AdminPermission));
}

/**
 * استخراج نطاق الصلاحيات من الجلسة
 */
export function getDataScope(session: { user?: SessionUser } | null): DataScope {
  const user = session?.user;
  const role = user?.role;
  const isAdmin = role === 'ADMIN';
  const isSuperAdmin = Boolean(user?.isSuperAdmin);
  const permissions = isSuperAdmin ? [...ADMIN_PERMISSIONS] : parsePermissions((user as { adminPermissions?: string })?.adminPermissions);
  return {
    isAdmin,
    isSuperAdmin,
    permissions,
    userId: user?.id,
    organizationId: (user as { organizationId?: string | null })?.organizationId ?? null,
  };
}

/**
 * هل المستخدم يملك صلاحية أدمن معينة؟ (أدمن كامل يملك الكل)
 */
export function hasAdminPermission(scope: DataScope, permission: AdminPermission): boolean {
  if (scope.isSuperAdmin) return true;
  if (!scope.isAdmin) return false;
  return scope.permissions.includes('FULL_ACCESS') || scope.permissions.includes(permission);
}

/**
 * هل يمكنه الوصول لهذا العقار؟ (أدمن: نعم؛ ب/ر: createdById أو organizationId؛ د: ownerId)
 */
export function canAccessProperty(
  scope: DataScope,
  property: { createdById?: string | null; organizationId?: string | null; ownerId?: string | null }
): boolean {
  if (scope.isAdmin && (scope.isSuperAdmin || hasAdminPermission(scope, 'MANAGE_PROPERTIES'))) return true;
  if (scope.userId && property.createdById === scope.userId) return true;
  if (scope.organizationId && property.organizationId === scope.organizationId) return true;
  if (scope.userId && property.ownerId === scope.userId) return true;
  return false;
}

/**
 * فلتر Prisma: where لعقارات المستخدم أو الكل للأدمن
 */
export function propertyScopeWhere(scope: DataScope): { OR?: Array<{ createdById: string } | { organizationId: string } | { ownerId: string }> } | object {
  if (scope.isAdmin) return {};
  const or: Array<{ createdById: string } | { organizationId: string } | { ownerId: string }> = [];
  if (scope.userId) {
    or.push({ createdById: scope.userId });
    or.push({ ownerId: scope.userId });
  }
  if (scope.organizationId) or.push({ organizationId: scope.organizationId });
  return or.length ? { OR: or } : { id: { in: [] } };
}

/** دور المستخدم من الجلسة */
export function getUserRole(session: { user?: SessionUser } | null): string | undefined {
  return session?.user?.role;
}

/**
 * صلاحيات العقار حسب نوع الحساب (أ ب ج د ر)
 * - canManage: إضافة/تعديل/اعتماد عقد — ب، ر (لنفس الشركة)، أ (دعم فني)
 * - canApproveContract: اعتماد العقد ومتابعته — ب، ر فقط
 * - canOnlyView: الاطلاع والمتابعة فقط — د (مالك)، أ (متفرج)
 * @param ownedOrganizationId عند دور COMPANY: معرف الشركة التي يملكها المستخدم (للعقارات التابعة للشركة)
 */
export function propertyAccess(
  scope: DataScope,
  role: string | undefined,
  property: { createdById?: string | null; organizationId?: string | null; ownerId?: string | null },
  ownedOrganizationId?: string | null
): { canManage: boolean; canApproveContract: boolean; canOnlyView: boolean } {
  const isAdmin = role === 'ADMIN';
  const isCompany = role === 'COMPANY';
  const isOrgManager = role === 'ORG_MANAGER';
  const isOwner = role === 'OWNER';

  if (isAdmin) {
    return { canManage: true, canApproveContract: false, canOnlyView: true };
  }
  const belongsToCompany = scope.userId && property.createdById === scope.userId;
  const belongsToOrg = ownedOrganizationId && property.organizationId === ownedOrganizationId;
  if (isCompany && (belongsToCompany || belongsToOrg)) {
    return { canManage: true, canApproveContract: true, canOnlyView: false };
  }
  if (isOrgManager && scope.organizationId && property.organizationId === scope.organizationId) {
    return { canManage: true, canApproveContract: true, canOnlyView: false };
  }
  if (isOwner && scope.userId && property.ownerId === scope.userId) {
    return { canManage: false, canApproveContract: false, canOnlyView: true };
  }
  return { canManage: false, canApproveContract: false, canOnlyView: false };
}
