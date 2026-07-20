/**
 * API Route: إنشاء حسابات تلقائية من دفتر العناوين
 * عند إضافة شخص في دفتر العناوين — يُنشأ له حساب تلقائياً
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRoles } from '@/lib/auth/guard';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { generateBhdSerial } from '@/lib/server/serialNumbers';
import { ensureAddressBookContactForUser } from '@/lib/server/ensureAddressBookForUser';
import { logAudit } from '@/lib/audit';

/** توليد كلمة مرور عشوائية آمنة */
function generatePassword(): string {
  return crypto.randomBytes(6).toString('base64').slice(0, 10) + '@' + Math.floor(Math.random() * 99);
}

/** تحديد الدور بناءً على التصنيف */
function classifyRole(classification: string): {
  role: string;
  prismaRole: 'CLIENT' | 'OWNER';
  serialCode: string;
} {
  const c = classification.toLowerCase();
  if (c.includes('owner') || c.includes('مالك') || c.includes('landlord') || c.includes('مالك')) {
    return { role: 'OWNER', prismaRole: 'OWNER', serialCode: 'USR-L' };
  }
  if (c.includes('manager') || c.includes('مدير')) {
    return { role: 'MANAGER', prismaRole: 'OWNER', serialCode: 'USR-L' };
  }
  return { role: 'TENANT', prismaRole: 'CLIENT', serialCode: 'USR-T' };
}

// ========== POST: إنشاء حساب من دفتر العناوين ==========
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const forbidden = requireRoles(auth, ['ADMIN', 'SUPER_ADMIN', 'COMPANY', 'ORG_MANAGER']);
    if (forbidden) return forbidden;

    const { contactId, classification, email, phone, name } = await req.json();
    if (!contactId || !classification || !email) {
      return NextResponse.json({ error: 'contactId, classification, email required' }, { status: 400 });
    }

    const { role, prismaRole, serialCode } = classifyRole(String(classification));
    const emailLower = String(email).trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: emailLower } });
    if (existing) {
      return NextResponse.json({ error: 'Email already registered', userId: existing.id }, { status: 409 });
    }

    const serialNumber = await generateBhdSerial(serialCode);
    const password = generatePassword();
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        serialNumber,
        email: emailLower,
        name: String(name || serialNumber).trim() || serialNumber,
        phone: phone ? String(phone) : null,
        role: prismaRole,
        password: hashedPassword,
      },
    });

    const autoAccount = await prisma.autoUserAccount.create({
      data: {
        contactId: String(contactId),
        userId: user.id,
        username: serialNumber,
        tempPassword: hashedPassword,
        role,
        classification: String(classification),
        status: 'PENDING',
        createdBy: auth.userId!,
      },
    });

    await ensureAddressBookContactForUser({
      userId: user.id,
      serialNumber: user.serialNumber,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      contactIdFromSource: String(contactId),
    });

    await logAudit({
      userId: auth.userId || null,
      action: 'USER_CREATED',
      targetType: 'User',
      targetId: user.id,
      details: { serialNumber, source: 'portal-auto-account', contactId },
    });

    return NextResponse.json({
      success: true,
      userId: user.id,
      username: serialNumber,
      password,
      role,
      autoAccountId: autoAccount.id,
      message: `تم إنشاء حساب ${role === 'TENANT' ? 'مستأجر' : role === 'OWNER' ? 'مالك' : 'مدير'} بنجاح`,
    });
  } catch (error) {
    console.error('[AutoAccount] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create account', message: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

// ========== GET: قائمة الحسابات المنشأة ==========
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const forbidden = requireRoles(auth, ['ADMIN', 'SUPER_ADMIN', 'COMPANY', 'ORG_MANAGER']);
    if (forbidden) return forbidden;

    const accounts = await prisma.autoUserAccount.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error('[AutoAccount List] Error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
