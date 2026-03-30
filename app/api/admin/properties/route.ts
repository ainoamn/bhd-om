/**
 * قائمة العقارات مع نطاق الصلاحيات وعمود «تابع لـ» للأدمن
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDataScope, propertyScopeWhere, hasAdminPermission } from '@/lib/auth/adminPermissions';
import { requireAuth } from '@/lib/auth/guard';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const token = auth.token as {
      sub?: string;
      role?: string;
      isSuperAdmin?: boolean;
      adminPermissions?: string;
      organizationId?: string | null;
    };
    const session = token
      ? {
          user: {
            id: token.sub as string | undefined,
            role: token.role as string | undefined,
            isSuperAdmin: Boolean(token.isSuperAdmin),
            adminPermissions: token.adminPermissions as string | undefined,
            organizationId: token.organizationId as string | null | undefined,
          },
        }
      : null;
    const scope = getDataScope(session);

    if (!scope.userId) {
      return NextResponse.json({ error: 'Unauthorized', list: [] }, { status: 401 });
    }

    if (scope.isAdmin && !hasAdminPermission(scope, 'MANAGE_PROPERTIES')) {
      return NextResponse.json({ error: 'Forbidden', list: [] }, { status: 403 });
    }

    const where = scope.isAdmin ? {} : propertyScopeWhere(scope);
    const properties = await prisma.property.findMany({
      where: { ...where, isArchived: false },
      include: {
        createdBy: { select: { id: true, name: true, email: true, serialNumber: true } },
        organization: { select: { id: true, nameAr: true, nameEn: true } },
        owner: { select: { id: true, name: true, email: true, serialNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const list = properties.map((p) => ({
      id: p.id,
      serialNumber: p.serialNumber,
      titleAr: p.titleAr,
      titleEn: p.titleEn,
      type: p.type,
      status: p.status,
      price: p.price,
      governorateAr: p.governorateAr,
      isArchived: p.isArchived,
      createdById: p.createdById,
      organizationId: p.organizationId,
      ownerId: p.ownerId,
      belongsToUser: p.createdBy ? { id: p.createdBy.id, name: p.createdBy.name, email: p.createdBy.email, serialNumber: p.createdBy.serialNumber } : null,
      belongsToOrg: p.organization ? { id: p.organization.id, nameAr: p.organization.nameAr, nameEn: p.organization.nameEn } : null,
      owner: p.owner ? { id: p.owner.id, name: p.owner.name, email: p.owner.email, serialNumber: p.owner.serialNumber } : null,
    }));

    return NextResponse.json({ list });
  } catch (e) {
    console.error('GET /api/admin/properties:', e);
    return NextResponse.json({ error: 'Server error', list: [] }, { status: 500 });
  }
}
