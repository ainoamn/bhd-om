import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getAuthSecret } from '@/lib/server/authSecret';

export interface GuardOptions {
  requiredRoles?: string[];
  requiredPermissions?: string[];
  requireAuth?: boolean;
}

const ADMIN_LIKE = new Set(['ADMIN', 'SUPER_ADMIN', 'ORG_MANAGER', 'ACCOUNTANT']);

export async function apiGuard(req: NextRequest, options: GuardOptions = {}) {
  const { requiredRoles = [], requiredPermissions = [], requireAuth = true } = options;

  if (!requireAuth) return { user: null, allowed: true };

  const token = await getToken({ req, secret: getAuthSecret() });
  if (!token) {
    return { user: null, allowed: false, response: NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 }) };
  }

  const userRole = (token.role as string)?.toUpperCase();
  if (requiredRoles.length > 0 && !requiredRoles.includes(userRole || '')) {
    return { user: token, allowed: false, response: NextResponse.json({ error: 'Forbidden', code: 'INSUFFICIENT_PERMISSIONS' }, { status: 403 }) };
  }

  if (requiredPermissions.length > 0) {
    const isSuper = userRole === 'SUPER_ADMIN' || (token as { isSuperAdmin?: boolean }).isSuperAdmin;
    if (!isSuper && userRole && !ADMIN_LIKE.has(userRole)) {
      return { user: token, allowed: false, response: NextResponse.json({ error: 'Forbidden', code: 'PERMISSION_DENIED' }, { status: 403 }) };
    }
  }

  return { user: token, allowed: true };
}

export function withAuth(handler: Function, options?: GuardOptions) {
  return async (req: NextRequest) => {
    const result = await apiGuard(req, options);
    if (!result.allowed) return result.response;
    return handler(req, result.user);
  };
}
