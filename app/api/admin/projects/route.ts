import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ProjectStatus } from '@prisma/client';
import { requireAuth, requireRoles } from '@/lib/auth/guard';
import { ensureProjectSerialNumber } from '@/lib/server/ensureEntitySerials';
import { generateBhdSerial } from '@/lib/server/serialNumbers';
import { HTTP_CACHE_VARY_AUTH } from '@/lib/server/httpCacheHeaders';

const CACHE_ADMIN_PROJECTS = 'private, no-store';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const role = auth.role || '';
    const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'COMPANY' || role === 'ORG_MANAGER';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden', list: [] }, { status: 403 });
    }

    const limitRaw = Number(req.nextUrl.searchParams.get('limit') || '0');
    const offsetRaw = Number(req.nextUrl.searchParams.get('offset') || '0');
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(500, Math.floor(limitRaw)) : 0;
    const offset = Number.isFinite(offsetRaw) && offsetRaw >= 0 ? Math.floor(offsetRaw) : 0;

    const totalCount = await prisma.project.count();
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
      ...(limit > 0 ? { skip: offset, take: limit } : {}),
    });

    const list = await Promise.all(
      projects.map(async (p) => {
        const serialNumber = await ensureProjectSerialNumber({
          id: p.id,
          status: p.status,
          serialNumber: p.serialNumber,
        });
        return {
          id: p.id,
          serialNumber,
          titleAr: p.titleAr,
          titleEn: p.titleEn,
          status: p.status,
          locationAr: p.locationAr,
          locationEn: p.locationEn,
          createdAt: p.createdAt.toISOString(),
        };
      })
    );

    return NextResponse.json(
      { list },
      {
        headers: {
          'Cache-Control': CACHE_ADMIN_PROJECTS,
          Vary: HTTP_CACHE_VARY_AUTH,
          'X-Total-Count': String(totalCount),
          'X-Limit': String(limit || totalCount),
          'X-Offset': String(offset),
        },
      }
    );
  } catch (e) {
    console.error('GET /api/admin/projects', e);
    return NextResponse.json({ error: 'Server error', list: [] }, { status: 500 });
  }
}

const PROJ_STATUS: Record<string, string> = {
  PLANNING: 'P',
  UNDER_DEVELOPMENT: 'D',
  UNDER_CONSTRUCTION: 'UC',
  COMPLETED: 'C',
};

const VALID_STATUS = new Set<string>(['PLANNING', 'UNDER_DEVELOPMENT', 'UNDER_CONSTRUCTION', 'COMPLETED']);

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const forbidden = requireRoles(auth, ['ADMIN', 'SUPER_ADMIN', 'COMPANY', 'ORG_MANAGER']);
    if (forbidden) return forbidden;
    if (!auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const titleAr = String(body.titleAr || '').trim();
    if (!titleAr) {
      return NextResponse.json({ error: 'titleAr required' }, { status: 400 });
    }
    const statusRaw = String(body.status || 'UNDER_CONSTRUCTION').trim().toUpperCase();
    const status = (VALID_STATUS.has(statusRaw) ? statusRaw : 'UNDER_CONSTRUCTION') as ProjectStatus;
    const code = PROJ_STATUS[status] ?? 'X';
    const serialNumber = await generateBhdSerial(`PRJ-${code}`);

    const project = await prisma.project.create({
      data: {
        serialNumber,
        titleAr,
        titleEn: String(body.titleEn || titleAr).trim(),
        descriptionAr: String(body.descriptionAr || '').trim(),
        descriptionEn: String(body.descriptionEn || '').trim(),
        status,
        locationAr: String(body.locationAr || '').trim(),
        locationEn: String(body.locationEn || body.locationAr || '').trim(),
        area: body.area != null && Number.isFinite(Number(body.area)) ? Number(body.area) : null,
        units: body.units != null && Number.isFinite(Number(body.units)) ? Number(body.units) : null,
        startDate: body.startDate ? new Date(String(body.startDate)) : null,
        completionDate: body.completionDate ? new Date(String(body.completionDate)) : null,
        imageUrl: null,
        images: '[]',
        userId: auth.userId,
      },
    });

    return NextResponse.json(
      {
        id: project.id,
        serialNumber: project.serialNumber,
        titleAr: project.titleAr,
        status: project.status,
      },
      { status: 201 }
    );
  } catch (e) {
    console.error('POST /api/admin/projects', e);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
