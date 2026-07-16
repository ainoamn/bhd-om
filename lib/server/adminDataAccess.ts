import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { JWT } from 'next-auth/jwt';
import { getAuthSecret } from '@/lib/server/authSecret';

/** عمليات /api/admin/data/* تتطلب دور ADMIN في JWT */
export async function requireAdminDataToken(req: NextRequest): Promise<JWT | NextResponse> {
  const token = await getToken({ req, secret: getAuthSecret() });
  if (!token || token.role !== 'ADMIN') {
    return NextResponse.json(
      {
        error: 'Unauthorized',
        message: 'Admin session required. Sign in again, then retry.',
      },
      { status: 401 }
    );
  }
  return token;
}
