import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hash } from 'bcryptjs';
import { z } from 'zod';

const DASHBOARD_TYPES = ['CLIENT', 'TENANT', 'LANDLORD', 'SUPPLIER', 'PARTNER', 'GOVERNMENT', 'AUTHORIZED_REP', 'COMPANY', 'OTHER'] as const;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        serialNumber: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        dashboardType: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (e) {
    console.error('Get user error:', e);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional().nullable(),
  role: z.enum(['ADMIN', 'CLIENT', 'OWNER']).optional(),
  dashboardType: z.enum(DASHBOARD_TYPES).optional().nullable(),
  newPassword: z.string().min(6).optional(),
});

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await _req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updates: { name?: string; email?: string; phone?: string | null; role?: 'ADMIN' | 'CLIENT' | 'OWNER'; dashboardType?: string | null; password?: string } = {};
    if (parsed.data.name !== undefined) updates.name = parsed.data.name.trim();
    if (parsed.data.email !== undefined) {
      const emailLower = parsed.data.email.toLowerCase().trim();
      const existing = await prisma.user.findFirst({ where: { email: emailLower, NOT: { id } } });
      if (existing) return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
      updates.email = emailLower;
    }
    if (parsed.data.phone !== undefined) updates.phone = parsed.data.phone?.trim() || null;
    if (parsed.data.role !== undefined) updates.role = parsed.data.role;
    if (parsed.data.dashboardType !== undefined) updates.dashboardType = parsed.data.dashboardType;
    if (parsed.data.newPassword) {
      updates.password = await hash(parsed.data.newPassword, 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updates,
      select: { id: true, serialNumber: true, name: true, email: true, phone: true, role: true, dashboardType: true, createdAt: true },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error('Update user error:', e);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
