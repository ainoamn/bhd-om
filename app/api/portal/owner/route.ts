/**
 * API Route: بيانات المالك
 * يجلب: العقارات، العقود، المستأجرين، الإيرادات للمالك الحالي
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRoles } from '@/lib/auth/guard';
import { prisma } from '@/lib/prisma';
import { findContractsForOwnerProperties } from '@/lib/portal/contractsForUser';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const forbidden = requireRoles(auth, [
      'OWNER',
      'LANDLORD',
      'ADMIN',
      'SUPER_ADMIN',
      'COMPANY',
      'ORG_MANAGER',
    ]);
    if (forbidden) return forbidden;

    const userId = auth.userId!;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, phone: true, role: true },
    });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const properties = await prisma.property.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        bookings: { take: 5, orderBy: { createdAt: 'desc' } },
      },
    });

    const contracts = await findContractsForOwnerProperties(
      properties.map((p) => p.id),
      50
    );

    const activeContracts = contracts.filter((c) => {
      try {
        const d = JSON.parse(c.data);
        return d.contractStatus === 'Active' || d.status === 'Active';
      } catch {
        return (c.status || '').toUpperCase() === 'ACTIVE';
      }
    }).length;

    return NextResponse.json(
      {
        user,
        properties,
        contracts,
        stats: {
          totalProperties: properties.length,
          activeContracts,
          totalContracts: contracts.length,
        },
      },
      {
        headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
      }
    );
  } catch (error) {
    console.error('[Portal/Owner] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
