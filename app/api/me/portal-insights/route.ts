import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { prisma } from '@/lib/prisma';
import { generatePortalInsights } from '@/lib/admin/dashboardInsights';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    if (!auth.token?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = String(auth.token.sub);
    const token = auth.token as { sub?: string; role?: string; email?: string };
    const role = String(token.role || 'CLIENT');

    if (role !== 'CLIENT' && role !== 'OWNER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();

    const [unreadNotifications, openMaintenance, subscription, bookingRows] = await Promise.all([
      prisma.notification.count({ where: { userId, readAt: null } }).catch(() => 0),
      prisma.maintenanceRequest
        .count({
          where: {
            reporterUserId: userId,
            status: { in: ['OPEN', 'IN_PROGRESS'] },
          },
        })
        .catch(() => 0),
      prisma.subscription.findUnique({ where: { userId }, select: { endAt: true, status: true } }).catch(() => null),
      prisma.bookingStorage.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    let activeBookings = 0;
    let pendingTasks = 0;
    for (const row of bookingRows) {
      try {
        const data = JSON.parse(row.data) as { email?: string; phone?: string; status?: string; userId?: string };
        const matches =
          data.userId === userId ||
          (token.email && row.emailNorm === String(token.email).trim().toLowerCase());
        if (!matches && role === 'CLIENT') continue;
        if (data.status === 'PENDING') pendingTasks++;
        if (data.status === 'CONFIRMED' || data.status === 'RENTED' || data.status === 'PENDING') activeBookings++;
      } catch {
        /* skip */
      }
    }

    pendingTasks += openMaintenance;
    pendingTasks += unreadNotifications > 0 ? 1 : 0;

    let subscriptionExpiringDays: number | null = null;
    if (subscription?.status === 'active' && subscription.endAt > now) {
      subscriptionExpiringDays = Math.ceil((subscription.endAt.getTime() - now.getTime()) / 86400000);
      if (subscriptionExpiringDays > 7) subscriptionExpiringDays = null;
    }

    const { insights, briefAr, briefEn } = generatePortalInsights({
      role: role === 'OWNER' ? 'OWNER' : 'CLIENT',
      pendingTasks,
      unreadNotifications,
      openMaintenance,
      activeBookings,
      subscriptionExpiringDays,
    });

    return NextResponse.json(
      {
        generatedAt: now.toISOString(),
        insights,
        briefAr,
        briefEn,
        counts: { pendingTasks, unreadNotifications, openMaintenance, activeBookings },
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (e) {
    console.error('GET /api/me/portal-insights', e);
    return NextResponse.json({ error: 'Failed to load portal insights' }, { status: 500 });
  }
}
