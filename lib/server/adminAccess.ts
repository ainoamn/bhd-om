import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getAuthSecret } from '@/lib/server/authSecret';

const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN']);

/** يقيّد مسارات التشخيص في الإنتاج — ADMIN فقط */
export async function requireAdminForDiagnostics(req: NextRequest): Promise<NextResponse | null> {
  if (process.env.NODE_ENV !== 'production') return null;
  const token = await getToken({ req, secret: getAuthSecret() });
  const role = (token?.role as string | undefined)?.toUpperCase();
  if (!token || !role || !ADMIN_ROLES.has(role)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return null;
}
