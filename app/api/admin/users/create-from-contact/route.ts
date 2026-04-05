import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { requireAuth, requireRoles } from '@/lib/auth/guard';
import { checkLimit } from '@/lib/subscriptions/entitlements';
import { logAudit } from '@/lib/audit';
import { generateBhdSerial } from '@/lib/server/serialNumbers';
import { ensureAddressBookContactForUser } from '@/lib/server/ensureAddressBookForUser';

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
  name: z.string().min(1).transform((s) => (s.trim().length >= 2 ? s.trim() : 'Contact')),
  email: z.string().optional(),
  phone: z.string().optional(),
  contactId: z.string().optional(),
  category: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const forbidden = requireRoles(auth, ['ADMIN', 'SUPER_ADMIN']);
    if (forbidden) return forbidden;

    const canCreate = await checkLimit(auth.userId || '', 'users');
    if (!canCreate) {
      return NextResponse.json({ error: 'Subscription limit reached' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
    }

    const { name, phone, contactId, category } = parsed.data;
    const rawEmail = (parsed.data.email || '').trim();

    const code = CATEGORY_PREFIX[category || 'OTHER'] ?? 'O';
    const serialNumber = await generateBhdSerial(`USR-${code}`);

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
    const user = await prisma.user.create({
      data: {
        serialNumber,
        email: emailLower,
        password: hashed,
        name: name.trim(),
        phone: phone?.trim() || null,
        role,
      },
    });

    await logAudit({
      userId: auth.userId || null,
      action: 'USER_CREATED',
      targetType: 'User',
      targetId: user.id,
      details: { serialNumber: user.serialNumber, source: 'create-from-contact' },
    });

    await ensureAddressBookContactForUser({
      userId: user.id,
      serialNumber: user.serialNumber,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      contactIdFromSource: contactId?.trim() || null,
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
