/**
 * تحديث عقار (مثلاً ربط المالك ownerId) — للأدمن أو الشركة/مدير الشركة لعقاراتهم فقط
 */
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import { getDataScope, propertyAccess, hasAdminPermission } from '@/lib/auth/adminPermissions';

export const runtime = 'nodejs';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV === 'development' ? 'bhd-dev-secret-not-for-production' : undefined),
    });
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
    const role = session?.user?.role;

    if (!scope.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const ownerId = body?.ownerId === undefined ? undefined : (body.ownerId === null || body.ownerId === '' ? null : String(body.ownerId));

    const property = await prisma.property.findUnique({
      where: { id },
      select: { id: true, createdById: true, organizationId: true, ownerId: true },
    });
    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    let ownedOrgId: string | null = null;
    if (role === 'COMPANY') {
      const org = await prisma.organization.findFirst({
        where: { ownerId: scope.userId },
        select: { id: true },
      });
      ownedOrgId = org?.id ?? null;
    }
    const access = propertyAccess(scope, role, property, ownedOrgId);
    if (!access.canManage) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (ownerId !== undefined) {
      if (ownerId !== null) {
        const ownerUser = await prisma.user.findUnique({
          where: { id: ownerId },
          select: { id: true, role: true },
        });
        if (!ownerUser || ownerUser.role !== 'OWNER') {
          return NextResponse.json({ error: 'Selected user must have role OWNER' }, { status: 400 });
        }
      }
      await prisma.property.update({
        where: { id },
        data: { ownerId },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('PATCH /api/admin/properties/[id]:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
