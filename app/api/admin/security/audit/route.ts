import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRoles } from '@/lib/auth/guard';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** سجلات AuditLog من الخادم — للوحة الأمان */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const forbidden = requireRoles(auth, ['ADMIN', 'SUPER_ADMIN']);
  if (forbidden) return forbidden;

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);

  const rows = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      severity: true,
      ipAddress: true,
      createdAt: true,
      userId: true,
    },
  });

  const failedLogins = rows.filter((r) => r.action === 'LOGIN_FAILURE').length;

  return NextResponse.json({
    items: rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })),
    summary: {
      total: rows.length,
      failedLogins,
    },
  });
}
