/**
 * API Route: بيانات المالك الشاملة v2
 * يجلب: مباني + وحدات + مستأجرين + إيرادات + مصاريف + أداء المستأجرين
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
      select: { id: true, name: true, email: true, phone: true },
    });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const properties = await prisma.property.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const propertyIds = properties.map((p) => p.id);
    const contracts = await findContractsForOwnerProperties(propertyIds, 100);

    const expenses = propertyIds.length
      ? await prisma.dueAmount.findMany({
          where: {
            propertyId: { in: propertyIds },
            type: { in: ['MAINTENANCE', 'BILL', 'OTHER'] },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        })
      : [];

    const tenantScores = await prisma.tenantScore.findMany({
      where: { category: 'OVERALL' },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const totalIncome = contracts.length; // placeholder until ledger linked
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

    return NextResponse.json(
      {
        user,
        properties,
        contracts,
        expenses,
        tenantScores,
        summary: {
          buildings: properties.length,
          contracts: contracts.length,
          expenses: totalExpenses,
          incomeHint: totalIncome,
        },
      },
      {
        headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' },
      }
    );
  } catch (error) {
    console.error('[Portal/OwnerV2] Error:', error);
    return NextResponse.json(
      { error: 'Internal error', message: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
