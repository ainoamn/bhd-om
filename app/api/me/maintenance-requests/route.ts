import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRoles } from '@/lib/auth/guard';
import { parsePaginationParams, paginationResponseHeaders } from '@/lib/server/pagination';
import type { MaintenanceStatus } from '@prisma/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PORTAL_ROLES = ['CLIENT', 'OWNER'] as const;

function mapRow(r: {
  id: string;
  propertyId: number | null;
  propertyLabelAr: string | null;
  propertyLabelEn: string | null;
  descriptionAr: string;
  descriptionEn: string | null;
  status: string;
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
    const forbidden = requireRoles(auth, [...PORTAL_ROLES]);
    if (forbidden) return forbidden;
    if (!auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const pagination = parsePaginationParams(url, { maxLimit: 100, defaultLimit: 50 });
    const openOnly = url.searchParams.get('openOnly') === '1';

    const where = {
      reporterUserId: auth.userId,
      ...(openOnly
        ? { status: { in: ['OPEN', 'IN_PROGRESS'] as MaintenanceStatus[] } }
        : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.maintenanceRequest.count({ where }),
      prisma.maintenanceRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination.offset,
        take: pagination.limit,
        select: {
          id: true,
          propertyId: true,
          propertyLabelAr: true,
          propertyLabelEn: true,
          descriptionAr: true,
          descriptionEn: true,
          status: true,
          priority: true,
          reporterName: true,
          reporterPhone: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    return NextResponse.json(
      { items: rows.map(mapRow), total },
      { headers: paginationResponseHeaders(total, pagination) }
    );
  } catch (e) {
    console.error('GET /api/me/maintenance-requests:', e);
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const forbidden = requireRoles(auth, [...PORTAL_ROLES]);
    if (forbidden) return forbidden;
    if (!auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { name: true, phone: true, email: true },
    });

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
        reporterName: String(body.reporterName || user?.name || '').trim() || null,
        reporterPhone: String(body.reporterPhone || user?.phone || '').trim() || null,
        reporterUserId: auth.userId,
        notes: null,
      },
    });

    return NextResponse.json(mapRow(row), { status: 201 });
  } catch (e) {
    console.error('POST /api/me/maintenance-requests:', e);
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}
