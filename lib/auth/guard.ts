import { NextRequest, NextResponse } from 'next/server';
import { normalizeRole, type SystemRole } from '@/lib/auth/roles';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAuthTokenFromRequest, tokenUserId } from '@/lib/auth/getAuthSubFromRequest';

export interface GuardContext {
  token: Awaited<ReturnType<typeof getAuthTokenFromRequest>>;
  role?: SystemRole;
  userId?: string;
}

export async function requireAuth(req: NextRequest): Promise<GuardContext | NextResponse> {
  const token = await getAuthTokenFromRequest(req);
  const userId = tokenUserId(token);
  if (token && userId) {
    const t = token as { role?: string };
    return {
      token,
      role: normalizeRole(t.role),
      userId,
    };
  }

  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  const sessionUserId = user?.id?.trim();
  if (sessionUserId) {
    const fallbackToken = {
      role: user?.role,
      sub: sessionUserId,
      id: sessionUserId,
    } as NonNullable<Awaited<ReturnType<typeof getAuthTokenFromRequest>>>;
    return {
      token: token ?? fallbackToken,
      role: normalizeRole(user?.role),
      userId: sessionUserId,
    };
  }

  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export function requireRoles(ctx: GuardContext, roles: SystemRole[]): NextResponse | null {
  if (!ctx.role || !roles.includes(ctx.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}
