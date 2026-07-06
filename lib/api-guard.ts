import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export interface GuardOptions {
  requiredRoles?: string[];
  requiredPermissions?: string[];
  requireAuth?: boolean;
}

export async function apiGuard(req: NextRequest, options: GuardOptions = {}) {
  const { requiredRoles = [], requireAuth = true } = options;

  if (!requireAuth) return { user: null, allowed: true };

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    return { user: null, allowed: false, response: NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 }) };
  }

  const userRole = (token.role as string)?.toUpperCase();
  if (requiredRoles.length > 0 && !requiredRoles.includes(userRole || '')) {
    return { user: token, allowed: false, response: NextResponse.json({ error: 'Forbidden', code: 'INSUFFICIENT_PERMISSIONS' }, { status: 403 }) };
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
