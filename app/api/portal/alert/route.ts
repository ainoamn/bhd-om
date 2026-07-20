/**
 * API Route: إدارة تنبيهات البوابة
 * المسار: /api/portal/alert
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { prisma } from '@/lib/prisma';

type AlertStatus = 'UNREAD' | 'READ' | 'DISMISSED';
const ALLOWED: AlertStatus[] = ['UNREAD', 'READ', 'DISMISSED'];

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const userId = auth.userId!;

    const alerts = await prisma.tenantAlert.findMany({
      where: { userId },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: 50,
    });

    return NextResponse.json({ success: true, alerts });
  } catch (error) {
    console.error('[Portal/Alert] GET', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const userId = auth.userId!;

    const body = await req.json();
    const alertId = String(body.alertId || '');
    const status = String(body.status || '') as AlertStatus;
    if (!alertId || !ALLOWED.includes(status)) {
      return NextResponse.json(
        { success: false, message: 'alertId و status صالحان مطلوبان' },
        { status: 400 }
      );
    }

    const existing = await prisma.tenantAlert.findFirst({
      where: { id: alertId, userId },
    });
    if (!existing) {
      return NextResponse.json({ success: false, message: 'التنبيه غير موجود' }, { status: 404 });
    }

    const alert = await prisma.tenantAlert.update({
      where: { id: alertId },
      data: {
        status,
        readAt: status === 'READ' || status === 'DISMISSED' ? new Date() : existing.readAt,
      },
    });

    return NextResponse.json({ success: true, alert });
  } catch (error) {
    console.error('[Portal/Alert] PUT', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
