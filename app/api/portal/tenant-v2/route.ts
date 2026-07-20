/**
 * API Route: بيانات المستأجر الشاملة v2
 * يجلب: عقود + تنبيهات + مهام + مبالغ مستحقة + تقييم + تقويم
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRoles } from '@/lib/auth/guard';
import { prisma } from '@/lib/prisma';
import { findContractsForTenantUser } from '@/lib/portal/contractsForUser';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const forbidden = requireRoles(auth, ['CLIENT', 'OWNER', 'LANDLORD', 'ADMIN', 'SUPER_ADMIN', 'COMPANY', 'ORG_MANAGER']);
    if (forbidden) return forbidden;

    const userId = auth.userId!;

    const [user, contracts, alerts, tasks, dueAmounts, scores] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
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

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const totalDue = dueAmounts.reduce((s, d) => s + (d.amount - d.paidAmount), 0);
    const overdueAmount = dueAmounts
      .filter((d) => d.status === 'OVERDUE')
      .reduce((s, d) => s + (d.amount - d.paidAmount), 0);

    const calendarEvents = dueAmounts.map((d) => ({
      title: d.type === 'RENT' ? 'استحقاق إيجار' : d.type === 'BILL' ? 'فاتورة' : 'مبلغ مستحق',
      date: d.dueDate.toISOString().split('T')[0],
      amount: d.amount,
      status: d.status,
    }));

    const overallScore = scores.find((s) => s.category === 'OVERALL');
    const rentScore = scores.find((s) => s.category === 'RENT_PAYMENT');
    const billScore = scores.find((s) => s.category === 'BILL_PAYMENT');
    const maintenanceScore = scores.find((s) => s.category === 'MAINTENANCE');

    return NextResponse.json(
      {
        user,
        contracts,
        alerts,
        tasks,
        dueAmounts,
        scores,
        summary: {
          totalDue,
          overdueAmount,
          totalAlerts: alerts.length,
          unreadAlerts: alerts.filter((a) => a.status === 'UNREAD').length,
          totalTasks: tasks.length,
          pendingTasks: tasks.filter((t) => t.status === 'PENDING').length,
          overallScore: overallScore?.score ?? null,
          scoreLevel: overallScore?.level ?? null,
        },
        scoresDetail: {
          rent: rentScore
            ? { score: rentScore.score, level: rentScore.level, notes: rentScore.notes }
            : null,
          bill: billScore
            ? { score: billScore.score, level: billScore.level, notes: billScore.notes }
            : null,
          maintenance: maintenanceScore
            ? {
                score: maintenanceScore.score,
                level: maintenanceScore.level,
                notes: maintenanceScore.notes,
              }
            : null,
        },
        calendar: calendarEvents,
      },
      {
        headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' },
      }
    );
  } catch (error) {
    console.error('[Portal/TenantV2] Error:', error);
    return NextResponse.json(
      { error: 'Internal error', message: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
