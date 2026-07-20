/**
 * بوابة المستأجر v2 — شاملة
 */
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import TenantDashboardV2 from '@/components/portal/TenantDashboardV2';
import { findContractsForTenantUser } from '@/lib/portal/contractsForUser';

export const metadata = {
  title: 'بوابة المستأجر | بن حمود',
  description: 'إدارة شاملة للعقود والمدفوعات والتنبيهات والمهام',
};

export default async function TenantPortalV2Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect(`/${locale}/login?callbackUrl=/${locale}/portal/tenant/v2`);
  }

  const userId = session.user.id;

  const [user, contracts, alerts, tasks, dueAmounts, scores] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, phone: true },
    }),
    findContractsForTenantUser(userId, 50),
    prisma.tenantAlert.findMany({
      where: { userId },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: 20,
    }),
    prisma.tenantTask.findMany({
      where: { assigneeId: userId },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
      take: 20,
    }),
    prisma.dueAmount.findMany({
      where: { userId, status: { in: ['PENDING', 'OVERDUE'] } },
      orderBy: [{ status: 'desc' }, { dueDate: 'asc' }],
    }),
    prisma.tenantScore.findMany({
      where: { tenantUserId: userId },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return (
    <main className="min-h-screen bg-gray-50" dir="rtl">
      <TenantDashboardV2
        user={user}
        contracts={contracts}
        alerts={alerts}
        tasks={tasks}
        dueAmounts={dueAmounts}
        scores={scores}
      />
    </main>
  );
}
