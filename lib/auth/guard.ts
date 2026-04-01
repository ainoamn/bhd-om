import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { normalizeRole, type SystemRole } from '@/lib/auth/roles';

const authSecret =
  process.env.NEXTAUTH_SECRET ||
  (process.env.NODE_ENV === 'development' ? 'bhd-dev-secret-not-for-production' : undefined);

export interface GuardContext {
  token: Awaited<ReturnType<typeof getToken>>;
  role?: SystemRole;
  userId?: string;
}

export async function requireAuth(req: NextRequest): Promise<GuardContext | NextResponse> {
  const token = await getToken({ req, secret: authSecret });
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // NextAuth قد يضع معرف المستخدم في `id` مباشرة بعد Credentials دون تعبئة `sub` فوراً
  const t = token as { sub?: string; id?: string };
  const userId = String(t.sub || t.id || '').trim();
  return {
    token,
    role: normalizeRole(token.role),
    userId,
  };
}

export function requireRoles(ctx: GuardContext, roles: SystemRole[]): NextResponse | null {
  if (!ctx.role || !roles.includes(ctx.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}
