import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/guard';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const role = auth.role || '';
    const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
    const url = new URL(req.url);
    const filterRole = url.searchParams.get('role');
    const limitParam = Number(url.searchParams.get('limit') || 0);
    const offsetParam = Number(url.searchParams.get('offset') || 0);
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 500) : 0;
    const offset = Number.isFinite(offsetParam) && offsetParam >= 0 ? offsetParam : 0;

    if (filterRole === 'OWNER') {
      if (!isAdmin && role !== 'COMPANY' && role !== 'ORG_MANAGER') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      const users = await prisma.user.findMany({
        where: { role: 'OWNER' },
        orderBy: { name: 'asc' },
        ...(limit > 0 ? { skip: offset, take: limit } : {}),
        select: { id: true, serialNumber: true, name: true, email: true, phone: true, role: true },
      });
      const total = await prisma.user.count({ where: { role: 'OWNER' } });
      return NextResponse.json(users, {
        headers: {
          'X-Total-Count': String(total),
          'X-Limit': String(limit || total),
          'X-Offset': String(offset),
        },
      });
    }

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      ...(limit > 0 ? { skip: offset, take: limit } : {}),
      select: {
        id: true,
        serialNumber: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        subscriptions: {
          take: 1,
          orderBy: { updatedAt: 'desc' },
          where: { status: 'active' },
          select: {
            id: true,
            planId: true,
            status: true,
            endAt: true,
            plan: { select: { id: true, code: true, nameAr: true, nameEn: true, priceMonthly: true, currency: true } },
          },
        },
      },
    });

    const list = users.map((u) => {
      const sub = u.subscriptions?.[0];
      return {
        id: u.id,
        serialNumber: u.serialNumber,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        createdAt: u.createdAt,
        plan: sub?.plan ? { id: sub.plan.id, code: sub.plan.code, nameAr: sub.plan.nameAr, nameEn: sub.plan.nameEn, priceMonthly: sub.plan.priceMonthly, currency: sub.plan.currency } : null,
        subscriptionEndAt: sub?.endAt?.toISOString?.() ?? null,
      };
    });

    const total = await prisma.user.count();
    return NextResponse.json(list, {
      headers: {
        'X-Total-Count': String(total),
        'X-Limit': String(limit || total),
        'X-Offset': String(offset),
      },
    });
  } catch (e) {
    console.error('Users list error:', e);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
