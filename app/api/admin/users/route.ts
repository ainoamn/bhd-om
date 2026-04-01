import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/guard';

const ROLE_SERIAL_CODE: Record<string, string> = {
  ADMIN: 'A',
  SUPER_ADMIN: 'A',
  CLIENT: 'C',
  OWNER: 'L',
  LANDLORD: 'L',
  COMPANY: 'P',
  ORG_MANAGER: 'M',
  ACCOUNTANT: 'N',
  PROPERTY_MANAGER: 'R',
  SALES_AGENT: 'S',
};

function isValidSerialNumber(value: string | null | undefined): boolean {
  const serial = String(value || '').trim().toUpperCase();
  return /^USR-[A-Z]-\d{4}-\d{4,5}$/.test(serial);
}

async function ensureUserSerialNumber(user: { id: string; role: string; serialNumber: string | null | undefined }) {
  if (isValidSerialNumber(user.serialNumber)) return String(user.serialNumber);
  const code = ROLE_SERIAL_CODE[String(user.role || '').toUpperCase()] || 'C';
  const year = new Date().getFullYear();
  const key = `USR-${code}-${year}`;
  const counter = await prisma.serialCounter.upsert({
    where: { key },
    create: { key, lastValue: 1 },
    update: { lastValue: { increment: 1 } },
  });
  const serialNumber = `USR-${code}-${year}-${String(counter.lastValue).padStart(4, '0')}`;
  await prisma.user.update({
    where: { id: user.id },
    data: { serialNumber },
  });
  return serialNumber;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const role = auth.role || '';
    const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
    const authUserId = auth.userId || '';
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
      const me = await prisma.user.findUnique({
        where: { id: authUserId },
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
      if (!me) {
        return NextResponse.json([], {
          headers: {
            'X-Total-Count': '0',
            'X-Limit': '0',
            'X-Offset': '0',
          },
        });
      }
      const ensuredSerial = await ensureUserSerialNumber({ id: me.id, role: me.role, serialNumber: me.serialNumber });
      const sub = me.subscriptions?.[0];
      return NextResponse.json(
        [
          {
            id: me.id,
            serialNumber: ensuredSerial,
            name: me.name,
            email: me.email,
            phone: me.phone,
            role: me.role,
            createdAt: me.createdAt,
            plan: sub?.plan
              ? {
                  id: sub.plan.id,
                  code: sub.plan.code,
                  nameAr: sub.plan.nameAr,
                  nameEn: sub.plan.nameEn,
                  priceMonthly: sub.plan.priceMonthly,
                  currency: sub.plan.currency,
                }
              : null,
            subscriptionEndAt: sub?.endAt?.toISOString?.() ?? null,
          },
        ],
        {
          headers: {
            'X-Total-Count': '1',
            'X-Limit': '1',
            'X-Offset': '0',
          },
        }
      );
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

    let list = await Promise.all(users.map(async (u) => {
      const ensuredSerial = await ensureUserSerialNumber({ id: u.id, role: u.role, serialNumber: u.serialNumber });
      const sub = u.subscriptions?.[0];
      return {
        id: u.id,
        serialNumber: ensuredSerial,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        createdAt: u.createdAt,
        plan: sub?.plan ? { id: sub.plan.id, code: sub.plan.code, nameAr: sub.plan.nameAr, nameEn: sub.plan.nameEn, priceMonthly: sub.plan.priceMonthly, currency: sub.plan.currency } : null,
        subscriptionEndAt: sub?.endAt?.toISOString?.() ?? null,
      };
    }));

    // حماية عملية: إذا رجعت القائمة فارغة رغم وجود جلسة صحيحة، أظهر المستخدم الحالي على الأقل.
    if (list.length === 0 && authUserId) {
      const me = await prisma.user.findUnique({
        where: { id: authUserId },
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
      if (me) {
        const ensuredSerial = await ensureUserSerialNumber({ id: me.id, role: me.role, serialNumber: me.serialNumber });
        const sub = me.subscriptions?.[0];
        list = [
          {
            id: me.id,
            serialNumber: ensuredSerial,
            name: me.name,
            email: me.email,
            phone: me.phone,
            role: me.role,
            createdAt: me.createdAt,
            plan: sub?.plan
              ? {
                  id: sub.plan.id,
                  code: sub.plan.code,
                  nameAr: sub.plan.nameAr,
                  nameEn: sub.plan.nameEn,
                  priceMonthly: sub.plan.priceMonthly,
                  currency: sub.plan.currency,
                }
              : null,
            subscriptionEndAt: sub?.endAt?.toISOString?.() ?? null,
          },
        ];
      }
    }

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
