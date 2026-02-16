/**
 * نظام الأرقام المتسلسلة
 * الصيغة: PREFIX-TYPE-YYYY-NNNN
 * - حروف تميز النوع (بيع، إيجار، استثمار، قيد المناقشة، ...)
 * - السنة لتمييز السنة وإعادة العد سنوياً
 * - رقم متسلسل يبدأ من 1 كل سنة جديدة
 */

const PAD_LENGTH = 4;

// رموز العقارات حسب النوع
const PROPERTY_TYPE_CODES: Record<string, string> = {
  RENT: 'R',
  SALE: 'S',
  INVESTMENT: 'I',
};

// رموز المشاريع حسب الحالة
const PROJECT_STATUS_CODES: Record<string, string> = {
  PLANNING: 'P',           // قيد المناقشة
  UNDER_DEVELOPMENT: 'D',   // قيد الإنجاز
  UNDER_CONSTRUCTION: 'UC', // قيد الإنجاز (إنشاء)
  COMPLETED: 'C',           // منجزة
};

// رموز المستخدمين حسب الدور
const USER_ROLE_CODES: Record<string, string> = {
  ADMIN: 'A',
  CLIENT: 'C',
  OWNER: 'O',
};

export type PropertyType = 'RENT' | 'SALE' | 'INVESTMENT';
export type ProjectStatus = 'PLANNING' | 'UNDER_DEVELOPMENT' | 'UNDER_CONSTRUCTION' | 'COMPLETED';
export type UserRole = 'ADMIN' | 'CLIENT' | 'OWNER';

/**
 * توليد مفتاح العداد (للتخزين في SerialCounter)
 */
export function getSerialCounterKey(
  entity: 'PROPERTY' | 'PROJECT' | 'USER',
  typeOrStatus: string,
  year?: number
): string {
  const y = year ?? new Date().getFullYear();
  const prefix = entity === 'PROPERTY' ? 'PRP' : entity === 'PROJECT' ? 'PRJ' : 'USR';
  const code =
    entity === 'PROPERTY'
      ? PROPERTY_TYPE_CODES[typeOrStatus] ?? 'X'
      : entity === 'PROJECT'
        ? PROJECT_STATUS_CODES[typeOrStatus] ?? 'X'
        : USER_ROLE_CODES[typeOrStatus] ?? 'X';
  return `${prefix}-${code}-${y}`;
}

/**
 * توليد رقم متسلسل للعرض (بدون DB)
 * يُستخدم مع البيانات الوهمية وعند الربط لاحقاً
 */
export function formatSerialNumber(
  entity: 'PROPERTY' | 'PROJECT' | 'USER',
  typeOrStatus: string,
  index: number,
  year?: number
): string {
  const y = year ?? new Date().getFullYear();
  const key = getSerialCounterKey(entity, typeOrStatus, y);
  const seq = String(index).padStart(PAD_LENGTH, '0');
  return `${key}-${seq}`;
}

/**
 * رمز العقار حسب النوع
 */
export function getPropertyTypeCode(type: PropertyType): string {
  return PROPERTY_TYPE_CODES[type] ?? 'X';
}

/**
 * رمز المشروع حسب الحالة
 */
export function getProjectStatusCode(status: ProjectStatus): string {
  return PROJECT_STATUS_CODES[status] ?? 'X';
}

/**
 * رمز المستخدم حسب الدور
 */
export function getUserRoleCode(role: UserRole): string {
  return USER_ROLE_CODES[role] ?? 'X';
}
