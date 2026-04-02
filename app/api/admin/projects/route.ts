import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/guard';
import { ensureProjectSerialNumber } from '@/lib/server/ensureEntitySerials';
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
