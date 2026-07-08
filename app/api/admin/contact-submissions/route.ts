import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRoles } from '@/lib/auth/guard';
import { parsePaginationParams, paginationResponseHeaders } from '@/lib/server/pagination';
import { decryptContactSubmissionFields } from '@/lib/server/piiField';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const forbidden = requireRoles(auth, ['ADMIN', 'SUPER_ADMIN', 'COMPANY', 'ORG_MANAGER']);
    if (forbidden) return forbidden;

    const url = new URL(req.url);
    const pagination = parsePaginationParams(url, { maxLimit: 200, defaultLimit: 50 });
    const type = url.searchParams.get('type')?.trim().toUpperCase();
    const unreadOnly = url.searchParams.get('unreadOnly') === 'true';

    const where = {
      ...(type === 'CONTACT' || type === 'CALLBACK' ? { type } : {}),
      ...(unreadOnly ? { isRead: false } : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.contactSubmission.count({ where }),
      prisma.contactSubmission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination.offset,
        take: pagination.limit,
      }),
    ]);

    return NextResponse.json(
      {
        items: rows.map((r) => {
          const pii = decryptContactSubmissionFields(r);
          return {
            id: r.id,
            name: pii.name,
            email: pii.email,
            phone: pii.phone,
            message: pii.message,
            type: r.type,
            isRead: r.isRead,
            createdAt: r.createdAt.toISOString(),
          };
        }),
        total,
        unreadCount: unreadOnly ? total : await prisma.contactSubmission.count({ where: { isRead: false } }),
      },
      { headers: paginationResponseHeaders(total, pagination) }
    );
  } catch (e) {
    console.error('GET /api/admin/contact-submissions:', e);
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 });
  }
}
