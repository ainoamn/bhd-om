import type { MaintenanceStatus, NotificationKind } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { bookingMatchesClientRecord, bookingVisibleToOwner, normPhoneLast8 } from '@/lib/data/ownerLandlordMatch';
import { listBookingStorageRows, parseBookingStorageData } from '@/lib/server/repositories/bookingStorageRepo';

export type NotificationRow = {
  id: string;
  kind: NotificationKind;
  titleAr: string;
  titleEn: string;
  bodyAr: string | null;
  bodyEn: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

type UpsertInput = {
  userId: string;
  kind: NotificationKind;
  titleAr: string;
  titleEn: string;
  bodyAr?: string;
  bodyEn?: string;
  href?: string;
  dedupeKey: string;
};

async function upsertNotification(input: UpsertInput): Promise<void> {
  await prisma.notification.upsert({
    where: { dedupeKey: input.dedupeKey },
    create: {
      userId: input.userId,
      kind: input.kind,
      titleAr: input.titleAr,
      titleEn: input.titleEn,
      bodyAr: input.bodyAr ?? null,
      bodyEn: input.bodyEn ?? null,
      href: input.href ?? null,
      dedupeKey: input.dedupeKey,
    },
    update: {
      titleAr: input.titleAr,
      titleEn: input.titleEn,
      bodyAr: input.bodyAr ?? null,
      bodyEn: input.bodyEn ?? null,
      href: input.href ?? null,
    },
  });
}

function contractStage(booking: Record<string, unknown>): string | undefined {
  const cd = booking.contractData as Record<string, unknown> | undefined;
  const stage = cd?.status ?? cd?.stage;
  return stage != null ? String(stage).trim().toUpperCase() : undefined;
}

/** مزامنة إشعارات من الحجوزات النشطة — idempotent عبر dedupeKey */
export async function syncNotificationsFromBookings(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, phone: true, role: true },
  });
  if (!user) return;

  const role = String(user.role || '').toUpperCase();
  const userEmailRaw = (user.email || '').trim().toLowerCase();
  const userPhone8 = normPhoneLast8(user.phone || '');
  if (userEmailRaw.length < 3 && userPhone8.length < 6) return;

  const { rows } = await listBookingStorageRows({ limit: 500, offset: 0, unlimited: true, adminScope: true });
  let bookings: Record<string, unknown>[] = [];
  for (const r of rows) {
    const parsed = parseBookingStorageData(r);
    if (parsed) bookings.push(parsed as Record<string, unknown>);
  }

  if (role === 'OWNER') {
    const ownedRows = await prisma.property.findMany({
      where: { ownerId: userId },
      select: { serialNumber: true },
    });
    const ownerPortfolioSerials = new Set(
      ownedRows.map((r) => String(r.serialNumber || '').trim()).filter(Boolean)
    );
    bookings = bookings.filter((b) =>
      bookingVisibleToOwner(b, userEmailRaw, userPhone8, user.phone, ownerPortfolioSerials)
    );
  } else {
    bookings = bookings.filter((b) => bookingMatchesClientRecord(b, userEmailRaw, userPhone8));
  }

  for (const b of bookings) {
    const bookingId = String(b.id || '').trim();
    if (!bookingId) continue;
    const status = String(b.status || '').toUpperCase();
    const paymentConfirmed = !!(b.paymentConfirmed || b.accountantConfirmedAt);
    const stage = contractStage(b);
    const serial = String(b.bookingSerial || bookingId);

    if (role === 'CLIENT') {
      if (status === 'PENDING') {
        await upsertNotification({
          userId,
          kind: 'BOOKING',
          dedupeKey: `booking:${bookingId}:pending`,
          titleAr: 'حجز قيد المراجعة',
          titleEn: 'Booking under review',
          bodyAr: `حجزك ${serial} بانتظار موافقة الإدارة.`,
          bodyEn: `Your booking ${serial} is awaiting admin approval.`,
          href: '/admin/my-bookings',
        });
      }
      if (status === 'CONFIRMED' && !paymentConfirmed) {
        await upsertNotification({
          userId,
          kind: 'PAYMENT',
          dedupeKey: `booking:${bookingId}:pay`,
          titleAr: 'أكمل الدفع',
          titleEn: 'Complete payment',
          bodyAr: `حجز ${serial} يحتاج إتمام الدفع.`,
          bodyEn: `Booking ${serial} requires payment.`,
          href: `/admin/my-bookings`,
        });
      }
      if (paymentConfirmed && (stage === 'ADMIN_APPROVED' || stage === 'TENANT_APPROVED' || !stage)) {
        await upsertNotification({
          userId,
          kind: 'CONTRACT',
          dedupeKey: `booking:${bookingId}:contract-client`,
          titleAr: 'راجع العقد',
          titleEn: 'Review contract',
          bodyAr: `العقد جاهز للمراجعة — ${serial}.`,
          bodyEn: `Contract ready for review — ${serial}.`,
          href: `/admin/contract-review?bookingId=${encodeURIComponent(bookingId)}`,
        });
      }
    }

    if (role === 'OWNER' && stage === 'ADMIN_APPROVED') {
      await upsertNotification({
        userId,
        kind: 'CONTRACT',
        dedupeKey: `booking:${bookingId}:contract-owner`,
        titleAr: 'موافقة مطلوبة',
        titleEn: 'Approval required',
        bodyAr: `حجز ${serial} يحتاج موافقتك كمالك.`,
        bodyEn: `Booking ${serial} needs your approval as owner.`,
        href: `/admin/contract-review?bookingId=${encodeURIComponent(bookingId)}`,
      });
    }
  }
}

export async function listUserNotifications(
  userId: string,
  opts: { limit?: number; offset?: number; unreadOnly?: boolean } = {}
): Promise<{ items: NotificationRow[]; total: number; unreadCount: number }> {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 100);
  const offset = Math.max(opts.offset ?? 0, 0);
  const where = {
    userId,
    ...(opts.unreadOnly ? { readAt: null } : {}),
  };

  const [rows, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);

  return {
    items: rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      titleAr: r.titleAr,
      titleEn: r.titleEn,
      bodyAr: r.bodyAr,
      bodyEn: r.bodyEn,
      href: r.href,
      readAt: r.readAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
    total,
    unreadCount,
  };
}

export async function markNotificationRead(userId: string, id: string): Promise<boolean> {
  const result = await prisma.notification.updateMany({
    where: { id, userId },
    data: { readAt: new Date() },
  });
  return result.count > 0;
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return result.count;
}

const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, { ar: string; en: string }> = {
  OPEN: { ar: 'مفتوح', en: 'Open' },
  IN_PROGRESS: { ar: 'قيد التنفيذ', en: 'In progress' },
  COMPLETED: { ar: 'مكتمل', en: 'Completed' },
  CANCELLED: { ar: 'ملغى', en: 'Cancelled' },
};

/** إشعار المستخدم عند تغيّر حالة طلب الصيانة */
export async function notifyMaintenanceStatusChange(
  requestId: string,
  userId: string | null | undefined,
  status: MaintenanceStatus,
  descriptionAr: string
): Promise<void> {
  if (!userId) return;
  const labels = MAINTENANCE_STATUS_LABELS[status] ?? { ar: status, en: status };
  const snippet = descriptionAr.trim().slice(0, 80);
  await upsertNotification({
    userId,
    kind: 'MAINTENANCE',
    dedupeKey: `maintenance:${requestId}:status:${status}`,
    titleAr: `تحديث صيانة — ${labels.ar}`,
    titleEn: `Maintenance update — ${labels.en}`,
    bodyAr: snippet || `تم تحديث حالة طلب الصيانة إلى ${labels.ar}.`,
    bodyEn: snippet || `Your maintenance request status is now ${labels.en}.`,
    href: '/admin/my-maintenance',
  });
}
