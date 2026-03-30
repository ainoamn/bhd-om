export const SYSTEM_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'ACCOUNTANT',
  'PROPERTY_MANAGER',
  'SALES_AGENT',
  'CLIENT',
  'LANDLORD',
  'SUBSCRIPTION_ADMIN',
  // Backward-compatible roles used in current system
  'COMPANY',
  'OWNER',
  'ORG_MANAGER',
] as const;

export type SystemRole = (typeof SYSTEM_ROLES)[number];

export function normalizeRole(raw: unknown): SystemRole | undefined {
  const role = String(raw || '').trim().toUpperCase();
  if (!role) return undefined;
  if (role === 'OWNER') return 'LANDLORD';
  if ((SYSTEM_ROLES as readonly string[]).includes(role)) return role as SystemRole;
  return undefined;
}

export function isAdminLikeRole(raw: unknown): boolean {
  const role = normalizeRole(raw);
  return role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'COMPANY' || role === 'ORG_MANAGER';
}
