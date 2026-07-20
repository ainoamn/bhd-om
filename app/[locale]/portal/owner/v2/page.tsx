/**
 * بوابة المالك v2
 */
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import OwnerDashboardV2 from '@/components/portal/OwnerDashboardV2';
import { findContractsForOwnerProperties } from '@/lib/portal/contractsForUser';

export const metadata = {
  title: 'بوابة المالك | بن حمود',
  description: 'إدارة المباني والمستأجرين والإيرادات والمصاريف',
};

export default async function OwnerPortalV2Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect(`/${locale}/login?callbackUrl=/${locale}/portal/owner/v2`);
  }

  const userId = session.user.id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, phone: true },
  });

  const properties = await prisma.property.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  const contracts = await findContractsForOwnerProperties(
    properties.map((p) => p.id),
    100
  );
  const expenses = properties.length
    ? await prisma.dueAmount.findMany({
        where: {
          propertyId: { in: properties.map((p) => p.id) },
          type: { in: ['MAINTENANCE', 'BILL', 'OTHER'] },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
    : [];
  const tenantScores = await prisma.tenantScore.findMany({
    where: { category: 'OVERALL' },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const activeContracts = contracts.filter((c) => (c.status || '').toUpperCase() !== 'CANCELLED').length;
  const stats = {
    totalProperties: properties.length,
    activeContracts,
    totalRevenue: 0,
    totalExpenses,
    netIncome: -totalExpenses,
    occupancyRate: properties.length
      ? Math.round((activeContracts / Math.max(properties.length, 1)) * 100)
      : 0,
  };

  const tenantPerformance = tenantScores.map((s) => ({
    tenantUserId: s.tenantUserId,
    score: s.score,
    level: s.level,
    notes: s.notes,
  }));

  return (
    <main className="min-h-screen bg-gray-50" dir="rtl">
      <OwnerDashboardV2
        user={user}
        properties={properties.map((p) => ({
          id: p.id,
          titleAr: p.titleAr,
          titleEn: p.titleEn,
          governorateAr: p.governorateAr,
          price: p.price,
          status: String(p.status),
          type: String(p.type),
          createdAt: p.createdAt,
        }))}
        contracts={contracts.map((c) => ({
          id: c.id,
          data: c.data,
          propertyId: c.propertyId != null ? String(c.propertyId) : null,
          status: c.status || '',
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        }))}
        expenses={expenses}
        stats={stats}
        tenantPerformance={tenantPerformance}
      />
    </main>
  );
}
