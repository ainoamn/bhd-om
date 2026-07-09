import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { isAdminLikeRole } from '@/lib/auth/roles';

/** مصادقة مسارات KV للنظام القديم — ADMIN أو أدوار إدارية */
export async function requireLegacyKvApiAccess(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const roleOk = isAdminLikeRole(auth.role) || auth.role === 'ADMIN' || auth.role === 'SUPER_ADMIN';
  if (!roleOk) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return auth;
}
