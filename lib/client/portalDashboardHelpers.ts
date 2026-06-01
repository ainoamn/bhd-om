import type { PropertyBooking } from '@/lib/data/bookings';
import type { PortalPendingTask } from '@/components/admin/PortalPendingTasksCard';

function contractStage(booking: PropertyBooking): string | undefined {
  const cd = (booking as PropertyBooking & { contractData?: Record<string, unknown> }).contractData;
  const stage = cd?.status ?? cd?.stage ?? booking.contractStage;
  return stage != null ? String(stage).trim().toUpperCase() : undefined;
}

export function buildClientPendingTasks(bookings: PropertyBooking[]): PortalPendingTask[] {
  const tasks: PortalPendingTask[] = [];
  for (const b of bookings) {
    const id = String(b.id);
    const label = String(b.propertyTitleAr || b.bookingSerial || id);
    const status = String(b.status || '').toUpperCase();
    const paymentConfirmed = !!(b.paymentConfirmed || (b as PropertyBooking & { accountantConfirmedAt?: string }).accountantConfirmedAt);
    const stage = contractStage(b);

    if (status === 'PENDING') {
      tasks.push({
        id: `pending-${id}`,
        kind: 'booking',
        titleAr: `حجز «${label}» بانتظار الموافقة`,
        titleEn: `Booking «${label}» awaiting approval`,
        href: '/admin/my-bookings',
      });
    }
    if (status === 'CONFIRMED' && !paymentConfirmed) {
      tasks.push({
        id: `pay-${id}`,
        kind: 'payment',
        titleAr: `أكمل دفع حجز «${label}»`,
        titleEn: `Complete payment for «${label}»`,
        href: '/admin/my-bookings',
      });
    }
    if (paymentConfirmed && (stage === 'ADMIN_APPROVED' || stage === 'TENANT_APPROVED' || !stage)) {
      tasks.push({
        id: `contract-${id}`,
        kind: 'contract',
        titleAr: `راجع واعتمد عقد «${label}»`,
        titleEn: `Review and approve contract «${label}»`,
        href: `/admin/contract-review?bookingId=${encodeURIComponent(id)}`,
      });
    }
  }
  return tasks;
}

export function buildOwnerPendingTasks(
  bookings: PropertyBooking[],
  verificationTasks: Array<{ bookingId: string; token: string }>
): PortalPendingTask[] {
  const tasks: PortalPendingTask[] = [];

  for (const t of verificationTasks) {
    tasks.push({
      id: `sign-${t.token}`,
      kind: 'sign',
      titleAr: `توقيع عقد — حجز ${t.bookingId}`,
      titleEn: `Sign contract — booking ${t.bookingId}`,
      href: `/sign/${encodeURIComponent(t.token)}`,
    });
  }

  for (const b of bookings) {
    const id = String(b.id);
    const label = String(b.propertyTitleAr || b.bookingSerial || id);
    const stage = contractStage(b);
    if (stage === 'ADMIN_APPROVED') {
      tasks.push({
        id: `owner-contract-${id}`,
        kind: 'contract',
        titleAr: `موافقة مالك على «${label}»`,
        titleEn: `Owner approval for «${label}»`,
        href: `/admin/contract-review?bookingId=${encodeURIComponent(id)}`,
      });
    }
  }

  return tasks;
}

export async function fetchUnreadNotificationsCount(): Promise<number> {
  try {
    const res = await fetch('/api/me/notifications?limit=1', { credentials: 'include', cache: 'no-store' });
    if (!res.ok) return 0;
    const data = (await res.json()) as { unreadCount?: number };
    return typeof data.unreadCount === 'number' ? data.unreadCount : 0;
  } catch {
    return 0;
  }
}

export async function fetchOpenMaintenanceTasks(): Promise<PortalPendingTask[]> {
  try {
    const res = await fetch('/api/me/maintenance-requests?openOnly=1&limit=20', {
      credentials: 'include',
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      items?: Array<{ id: string; propertyLabelAr?: string | null; descriptionAr?: string; status?: string }>;
    };
    const items = Array.isArray(data.items) ? data.items : [];
    return items.map((row) => {
      const label = String(row.propertyLabelAr || row.descriptionAr || row.id).trim();
      return {
        id: `maint-${row.id}`,
        kind: 'maintenance' as const,
        titleAr: `متابعة صيانة — ${label}`,
        titleEn: `Maintenance follow-up — ${label}`,
        href: '/admin/my-maintenance',
      };
    });
  } catch {
    return [];
  }
}
