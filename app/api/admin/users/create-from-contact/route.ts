import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hash } from 'bcryptjs';
import { z } from 'zod';

function generateTempPassword(length = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let p = '';
  for (let i = 0; i < length; i++) p += chars[Math.floor(Math.random() * chars.length)];
  return p;
}

/** رموز التصنيف لرقم المستخدم: USR-{Code}-{Year}-{Seq} */
const CATEGORY_PREFIX: Record<string, string> = {
  CLIENT: 'C',
  TENANT: 'T',
  LANDLORD: 'L',
  SUPPLIER: 'S',
  PARTNER: 'P',
  GOVERNMENT: 'G',
  AUTHORIZED_REP: 'A',
  COMPANY: 'C',
  OTHER: 'O',
};

const schema = z.object({
  name: z.string().min(2),
  email: z.string().optional(),
  phone: z.string().optional(),
  contactId: z.string().optional(),
  category: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
    }

    const { name, phone, contactId, category } = parsed.data;
    const rawEmail = (parsed.data.email || '').trim();

    const code = CATEGORY_PREFIX[category || 'OTHER'] ?? 'O';
    const year = new Date().getFullYear();
    const key = `USR-${code}-${year}`;
    const counter = await prisma.serialCounter.upsert({
      where: { key },
      create: { key, lastValue: 1 },
      update: { lastValue: { increment: 1 } },
    });
    const serialNumber = `USR-${code}-${year}-${String(counter.lastValue).padStart(4, '0')}`;

    const usePlaceholderEmail = !rawEmail || !rawEmail.includes('@');
    const emailLower = usePlaceholderEmail
      ? `${serialNumber.toLowerCase().replace(/-/g, '')}@nologin.bhd`
      : rawEmail.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email: emailLower } });
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const tempPassword = generateTempPassword(10);
    const hashed = await hash(tempPassword, 10);

    const role = (category === 'LANDLORD' || category === 'COMPANY') ? 'OWNER' : 'CLIENT';
    const dashboardType = ['CLIENT', 'TENANT', 'LANDLORD', 'SUPPLIER', 'PARTNER', 'GOVERNMENT', 'AUTHORIZED_REP', 'COMPANY', 'OTHER'].includes(category || '')
      ? category : null;
    const user = await prisma.user.create({
      data: {
        serialNumber,
        email: emailLower,
        password: hashed,
        name: name.trim(),
        phone: phone?.trim() || null,
        role,
        dashboardType,
      },
    });

    return NextResponse.json({
      success: true,
      userId: user.id,
      serialNumber,
      email: emailLower,
      generatedPassword: tempPassword,
      contactId,
    });
  } catch (e) {
    console.error('Create user from contact error:', e);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
