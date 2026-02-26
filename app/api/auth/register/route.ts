import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const registerSchema = z.object({
  name: z.string().min(2, 'Name too short'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      );
    }
    const { name, email, phone, password } = parsed.data;
    const emailLower = email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({
      where: { email: emailLower },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }

    const year = new Date().getFullYear();
    const key = `USR-C-${year}`;
    const counter = await prisma.serialCounter.upsert({
      where: { key },
      create: { key, lastValue: 1 },
      update: { lastValue: { increment: 1 } },
    });
    const serialNumber = `USR-C-${year}-${String(counter.lastValue).padStart(4, '0')}`;

    const hashed = await hash(password, 10);
    await prisma.user.create({
      data: {
        serialNumber,
        email: emailLower,
        password: hashed,
        name: name.trim(),
        phone: phone?.trim() || null,
        role: 'CLIENT',
      },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Register error:', e);
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}
