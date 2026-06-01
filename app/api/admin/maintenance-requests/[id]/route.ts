import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRoles } from '@/lib/auth/guard';
import { notifyMaintenanceStatusChange } from '@/lib/server/notifications';
import type { MaintenanceStatus } from '@prisma/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_STATUS = new Set<MaintenanceStatus>(['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const forbidden = requireRoles(auth, ['ADMIN', 'SUPER_ADMIN', 'COMPANY', 'ORG_MANAGER']);
    if (forbidden) return forbidden;

    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as {
      status?: string;
      priority?: string;
      notes?: string;
    };

    const data: { status?: MaintenanceStatus; priority?: string; notes?: string | null } = {};
    if (body.status) {
      const s = body.status.trim().toUpperCase() as MaintenanceStatus;
      if (!VALID_STATUS.has(s)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      data.status = s;
    }
    if (body.priority) data.priority = body.priority.trim();
    if (body.notes !== undefined) data.notes = String(body.notes || '').trim() || null;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No updates' }, { status: 400 });
    }

    const existing = await prisma.maintenanceRequest.findUnique({
      where: { id },
      select: { reporterUserId: true, status: true, descriptionAr: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const row = await prisma.maintenanceRequest.update({ where: { id }, data });
    if (data.status && data.status !== existing.status) {
      await notifyMaintenanceStatusChange(id, existing.reporterUserId, data.status, existing.descriptionAr);
    }
    return NextResponse.json({
      id: row.id,
      status: row.status,
      priority: row.priority,
      notes: row.notes,
      updatedAt: row.updatedAt.toISOString(),
    });
  } catch (e) {
    console.error('PATCH /api/admin/maintenance-requests/[id]:', e);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
