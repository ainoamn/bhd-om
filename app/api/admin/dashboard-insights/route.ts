import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRoles } from '@/lib/auth/guard';
import { prisma } from '@/lib/prisma';
import { getPaymentGatewayStatus } from '@/lib/server/paymentGateway';
import { getLegacyBookingSettingsStatus } from '@/lib/server/legacyBookingSettingsCleanup';
import {
  computeHealthScore,
  generateAdminInsights,
  type AdminDashboardSnapshot,
  type PriorityItem,
} from '@/lib/admin/dashboardInsights';
import { listBookingStorageRows, parseBookingStorageData } from '@/lib/server/repositories/bookingStorageRepo';

export const dynamic = 'force-dynamic';

function guestName(parsed: Record<string, unknown>): string {
  return String(parsed.name || parsed.guestName || parsed.email || '—').trim() || '—';
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const forbidden = requireRoles(auth, ['ADMIN', 'SUPER_ADMIN']);
    if (forbidden) return forbidden;

    const now = new Date();
    const in7Days = new Date(now);
    in7Days.setDate(in7Days.getDate() + 7);

    const [payment, legacy, dbPing, properties, projects, users, bookingsPending, bookingsConfirmed, bookingsTotal, subscriptionsTotal, subscriptionsActive, subscriptionsExpiringSoon, contactUnread, maintenanceOpen, recentBookings] =
      await Promise.all([
        Promise.resolve(getPaymentGatewayStatus()),
        getLegacyBookingSettingsStatus(),
        prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
        prisma.property.count({ where: { isArchived: false } }).catch(() => prisma.property.count()),
        prisma.project.count().catch(() => 0),
        prisma.user.count().catch(() => 0),
        prisma.bookingStorage.count({ where: { status: 'PENDING' } }),
        prisma.bookingStorage.count({ where: { status: { in: ['CONFIRMED', 'RENTED'] } } }),
        prisma.bookingStorage.count(),
        prisma.subscription.count().catch(() => 0),
        prisma.subscription.count({ where: { status: 'active', endAt: { gt: now } } }).catch(() => 0),
        prisma.subscription
          .count({ where: { status: 'active', endAt: { gt: now, lte: in7Days } } })
          .catch(() => 0),
        prisma.contactSubmission.count({ where: { isRead: false } }).catch(() => 0),
        prisma.maintenanceRequest.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }).catch(() => 0),
        listBookingStorageRows({ limit: 12, offset: 0, adminScope: true, unlimited: false }),
      ]);

    const envConfigured =
      Boolean(process.env.NEXTAUTH_SECRET?.trim()) &&
      Boolean(process.env.DATABASE_URL?.trim()) &&
      payment.nextAuthUrlSet;

    const healthScore = computeHealthScore({
      dbOk: dbPing === true,
      paymentReady: payment.productionReady,
      legacyMigrated: legacy.fullyMigrated,
      envConfigured,
    });

    const recentParsed = recentBookings.rows
      .map((row) => {
        const parsed = parseBookingStorageData(row);
        if (!parsed) return null;
        return {
          id: String(parsed.id || row.bookingId),
          type: String(parsed.type || parsed.bookingType || 'BOOKING'),
          status: String(parsed.status || 'PENDING'),
          guestName: guestName(parsed as Record<string, unknown>),
          propertyTitleAr: String(parsed.propertyTitleAr || ''),
          propertyTitleEn: String(parsed.propertyTitleEn || ''),
          createdAt: row.createdAt.toISOString(),
        };
      })
      .filter(Boolean) as AdminDashboardSnapshot['recentBookings'];

    const pendingRows = await prisma.bookingStorage.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      take: 8,
    });

    const priorityItems: PriorityItem[] = pendingRows
      .map((row) => {
        const parsed = parseBookingStorageData(row);
        if (!parsed) return null;
        const id = String(parsed.id || row.bookingId);
        const type = String(parsed.type || parsed.bookingType || 'BOOKING');
        return {
          id,
          kind: 'booking' as const,
          titleAr: `${type === 'BOOKING' ? 'حجز' : 'معاينة'} — ${guestName(parsed as Record<string, unknown>)}`,
          titleEn: `${type === 'BOOKING' ? 'Booking' : 'Viewing'} — ${guestName(parsed as Record<string, unknown>)}`,
          subtitleAr: String(parsed.propertyTitleAr || parsed.propertyTitleEn || '—'),
          subtitleEn: String(parsed.propertyTitleEn || parsed.propertyTitleAr || '—'),
          href: `/admin/bookings?highlight=${encodeURIComponent(id)}`,
          createdAt: row.createdAt.toISOString(),
          badgeAr: 'قيد المراجعة',
          badgeEn: 'Pending review',
        };
      })
      .filter(Boolean) as PriorityItem[];

    if (contactUnread > 0) {
      priorityItems.unshift({
        id: 'contact-unread',
        kind: 'contact',
        titleAr: 'رسائل تواصل جديدة',
        titleEn: 'New contact messages',
        subtitleAr: `${contactUnread} رسالة غير مقروءة`,
        subtitleEn: `${contactUnread} unread message(s)`,
        href: '/admin/submissions',
        createdAt: now.toISOString(),
        badgeAr: 'تواصل',
        badgeEn: 'Contact',
      });
    }

    const snapshot: AdminDashboardSnapshot = {
      counts: {
        properties,
        projects,
        users,
        bookingsTotal,
        bookingsPending,
        bookingsConfirmed,
        subscriptionsTotal,
        subscriptionsActive,
        subscriptionsExpiringSoon,
        contactUnread,
        maintenanceOpen,
      },
      healthScore,
      recentBookings: recentParsed,
      priorityItems: priorityItems.slice(0, 10),
    };

    const { insights, briefAr, briefEn, activity } = generateAdminInsights(snapshot);

    return NextResponse.json(
      {
        generatedAt: now.toISOString(),
        healthScore,
        counts: snapshot.counts,
        insights,
        briefAr,
        briefEn,
        activity,
        priorityItems: snapshot.priorityItems,
        readiness: {
          dbOk: dbPing === true,
          paymentReady: payment.productionReady,
          legacyMigrated: legacy.fullyMigrated,
        },
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (e) {
    console.error('GET /api/admin/dashboard-insights', e);
    return NextResponse.json({ error: 'Failed to load dashboard insights' }, { status: 500 });
  }
}
