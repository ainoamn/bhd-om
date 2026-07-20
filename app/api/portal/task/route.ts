/**
 * API Route: إدارة المهام (Tenant Tasks)
 * المسار: /api/portal/task
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { prisma } from '@/lib/prisma';

type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
const ALLOWED_STATUSES: TaskStatus[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const userId = auth.userId!;

    const tasks = await prisma.tenantTask.findMany({
      where: {
        OR: [{ assigneeId: userId }, { assignerId: userId }],
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, tasks });
  } catch (error) {
    console.error('[Portal/Task] GET', error);
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
    const taskId = String(body.taskId || '');
    const status = String(body.status || '') as TaskStatus;
    if (!taskId || !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, message: 'taskId و status صالحان مطلوبان' },
        { status: 400 }
      );
    }

    const existing = await prisma.tenantTask.findFirst({
      where: {
        id: taskId,
        OR: [{ assigneeId: userId }, { assignerId: userId }],
      },
    });
    if (!existing) {
      return NextResponse.json({ success: false, message: 'المهمة غير موجودة' }, { status: 404 });
    }

    const task = await prisma.tenantTask.update({
      where: { id: taskId },
      data: {
        status,
        completedAt: status === 'COMPLETED' ? new Date() : existing.completedAt,
      },
    });

    return NextResponse.json({ success: true, task });
  } catch (error) {
    console.error('[Portal/Task] PUT', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
