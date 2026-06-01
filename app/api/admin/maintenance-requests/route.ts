import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRoles } from '@/lib/auth/guard';
import { parsePaginationParams, paginationResponseHeaders } from '@/lib/server/pagination';
import type { MaintenanceStatus } from '@prisma/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'COMPANY', 'ORG_MANAGER'] as const;

function mapRow(r: {
  id: string;
  propertyId: number | null;
  propertyLabelAr: string | null;
  propertyLabelEn: string | null;
  descriptionAr: string;
  descriptionEn: string | null;
  status: MaintenanceStatus;
  priority: string;
  reporterName: string | null;
  reporterPhone: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: r.id,
    propertyId: r.propertyId,
    propertyLabelAr: r.propertyLabelAr,
    propertyLabelEn: r.propertyLabelEn,
    descriptionAr: r.descriptionAr,
    descriptionEn: r.descriptionEn,
    status: r.status,
    priority: r.priority,
    reporterName: r.reporterName,
    reporterPhone: r.reporterPhone,
    notes: r.notes,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const forbidden = requireRoles(auth, [...ADMIN_ROLES]);
    if (forbidden) return forbidden;

    const url = new URL(req.url);
    const pagination = parsePaginationParams(url, { maxLimit: 200, defaultLimit: 50 });
    const status = url.searchParams.get('status')?.trim().toUpperCase() as MaintenanceStatus | undefined;

    const where = status ? { status } : {};
    const [total, rows] = await Promise.all([
      prisma.maintenanceRequest.count({ where }),
      prisma.maintenanceRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination.offset,
        take: pagination.limit,
      }),
    ]);

    return NextResponse.json(
      { items: rows.map(mapRow), total },
      { headers: paginationResponseHeaders(total, pagination) }
    );
  } catch (e) {
    console.error('GET /api/admin/maintenance-requests:', e);
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const forbidden = requireRoles(auth, [...ADMIN_ROLES]);
    if (forbidden) return forbidden;

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const descriptionAr = String(body.descriptionAr || '').trim();
    if (!descriptionAr) {
      return NextResponse.json({ error: 'descriptionAr required' }, { status: 400 });
    }

    const row = await prisma.maintenanceRequest.create({
      data: {
        propertyId: body.propertyId != null && Number.isFinite(Number(body.propertyId)) ? Number(body.propertyId) : null,
        propertyLabelAr: String(body.propertyLabelAr || '').trim() || null,
        propertyLabelEn: String(body.propertyLabelEn || '').trim() || null,
        descriptionAr,
        descriptionEn: String(body.descriptionEn || '').trim() || null,
        priority: String(body.priority || 'NORMAL').trim() || 'NORMAL',
        reporterName: String(body.reporterName || '').trim() || null,
        reporterPhone: String(body.reporterPhone || '').trim() || null,
        reporterUserId: auth.userId || null,
        notes: String(body.notes || '').trim() || null,
      },
    });

    return NextResponse.json(mapRow(row), { status: 201 });
  } catch (e) {
    console.error('POST /api/admin/maintenance-requests:', e);
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}
