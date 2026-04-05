import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { generateBhdSerial } from '@/lib/server/serialNumbers';
import { ensureAddressBookContactForUser } from '@/lib/server/ensureAddressBookForUser';

function normalizeDigitsPhone(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 8 && digits.startsWith('9')) return '968' + digits;
  if (digits.length >= 8 && !digits.startsWith('968')) return '968' + digits.replace(/^0+/, '');
  return digits;
}

const registerSchema = z.object({
  name: z.string().min(2, 'Name too short'),
  email: z.string().email('Invalid email'),
  phone: z.string().min(8, 'Phone too short'),
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
    const phoneNorm = normalizeDigitsPhone(phone);

    const existing = await prisma.user.findUnique({
      where: { email: emailLower },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }

    if (phoneNorm.replace(/\D/g, '').length >= 8) {
      const phoneTaken = await prisma.user.findFirst({
        where: { phone: phoneNorm },
      });
      if (phoneTaken) {
        return NextResponse.json({ error: 'Phone already registered' }, { status: 409 });
      }
    }

    const serialNumber = await generateBhdSerial('USR-C');

    const hashed = await hash(password, 10);
    const user = await prisma.user.create({
      data: {
        serialNumber,
        email: emailLower,
        password: hashed,
        name: name.trim(),
        phone: phoneNorm,
        role: 'CLIENT',
      },
    });

    await ensureAddressBookContactForUser({
      userId: user.id,
      serialNumber: user.serialNumber,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
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
