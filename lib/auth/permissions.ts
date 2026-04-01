import { normalizeRole, type SystemRole } from '@/lib/auth/roles';

const ROUTE_PERMISSIONS: Record<SystemRole, string[]> = {
  SUPER_ADMIN: ['*'],
  ADMIN: ['/admin', '/api/admin', '/api/bookings', '/api/subscriptions', '/api/accounting', '/api/user/linked-contact'],
  COMPANY: ['/admin', '/api/admin/properties', '/api/bookings', '/api/subscriptions', '/api/accounting', '/api/user/linked-contact'],
  ORG_MANAGER: ['/admin', '/api/admin/properties', '/api/bookings', '/api/subscriptions', '/api/accounting', '/api/user/linked-contact'],
  ACCOUNTANT: ['/admin/accounting', '/api/accounting', '/api/bookings', '/api/user/linked-contact'],
  PROPERTY_MANAGER: ['/admin/properties', '/admin/bookings', '/api/admin/properties', '/api/bookings', '/api/user/linked-contact'],
  SALES_AGENT: ['/admin/bookings', '/api/bookings', '/api/user/linked-contact'],
  CLIENT: ['/admin/my-', '/api/me/', '/api/user/linked-contact', '/api/bookings'],
  OWNER: ['/admin/my-', '/api/me/', '/api/user/linked-contact', '/api/bookings', '/api/admin/properties'],
  LANDLORD: ['/admin/my-', '/api/me/', '/api/user/linked-contact', '/api/bookings', '/api/admin/properties'],
  SUBSCRIPTION_ADMIN: ['/admin/subscriptions', '/api/subscriptions', '/api/user/linked-contact'],
};

function stripLocale(pathname: string): string {
  return pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '') || pathname;
}

export function canAccessRoute(rawRole: unknown, pathname: string): boolean {
  const role = normalizeRole(rawRole);
  if (!role) return false;
  const cleanPath = stripLocale(pathname);
  const allowed = ROUTE_PERMISSIONS[role] || [];
  return allowed.some((prefix) => prefix === '*' || cleanPath === prefix || cleanPath.startsWith(prefix));
}

export function getDefaultRouteForRole(rawRole: unknown): string {
  const role = normalizeRole(rawRole);
  switch (role) {
    case 'SUPER_ADMIN':
    case 'ADMIN':
    case 'COMPANY':
    case 'ORG_MANAGER':
    case 'SUBSCRIPTION_ADMIN':
      return '/admin';
    case 'ACCOUNTANT':
      return '/admin/accounting';
    case 'PROPERTY_MANAGER':
      return '/admin/properties';
    case 'SALES_AGENT':
      return '/admin/bookings';
    case 'OWNER':
    case 'LANDLORD':
      return '/admin/my-properties';
    case 'CLIENT':
      return '/admin/my-bookings';
    default:
      return '/admin';
  }
}
