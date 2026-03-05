import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const role = token.role as string;
    const isAdmin = role === 'ADMIN';
    const url = new URL(req.url);
    const filterRole = url.searchParams.get('role');

    if (filterRole === 'OWNER') {
      if (!isAdmin && role !== 'COMPANY' && role !== 'ORG_MANAGER') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      const users = await prisma.user.findMany({
        where: { role: 'OWNER' },
        orderBy: { name: 'asc' },
        select: { id: true, serialNumber: true, name: true, email: true, phone: true, role: true },
      });
      return NextResponse.json(users);
    }

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        serialNumber: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(users);
  } catch (e) {
    console.error('Users list error:', e);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
