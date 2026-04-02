import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRoles } from '@/lib/auth/guard';
import { buildSerialCounterKey, generateBhdSerial, isValidBhdSerial } from '@/lib/server/serialNumbers';

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

async function seedUsrSerialCounterFromExistingUsers(typeCode: string, year: number) {
  const prefix = `BHD-${year}-${typeCode}-`;
  const existing = await prisma.user.findMany({
    where: { serialNumber: { startsWith: prefix } },
    select: { serialNumber: true },
  });
  let maxSeq = 0;
  for (const u of existing) {
    const sn = String(u.serialNumber ?? '');
    if (!sn.startsWith(prefix)) continue;
    const last = sn.split('-').pop();
    const seq = last ? Number.parseInt(last, 10) : NaN;
    if (Number.isFinite(seq)) maxSeq = Math.max(maxSeq, seq);
  }
  if (maxSeq <= 0) return;
  const key = buildSerialCounterKey(typeCode, year);
  await prisma.serialCounter.upsert({
    where: { key },
    create: { key, lastValue: maxSeq },
    update: { lastValue: maxSeq },
  });
}

async function assignUserSerial(user: { id: string; role: string; serialNumber: string; createdAt: Date }) {
  if (isValidBhdSerial(user.serialNumber)) return user.serialNumber;
  const code = ROLE_SERIAL_CODE[String(user.role || '').toUpperCase()] || 'C';
  const typeCode = `USR-${code}`;
  const year = user.createdAt.getFullYear();
  await seedUsrSerialCounterFromExistingUsers(typeCode, year);

  for (let attempt = 0; attempt < 8; attempt++) {
    const serialNumber = await generateBhdSerial(typeCode, { year });
    try {
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { serialNumber },
        select: { serialNumber: true },
      });
      return updated.serialNumber;
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code === 'P2002') {
        await seedUsrSerialCounterFromExistingUsers(typeCode, year);
        continue;
      }
      throw e;
    }
  }
  throw new Error('Unable to assign unique serialNumber');
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const forbidden = requireRoles(auth, ['ADMIN', 'SUPER_ADMIN']);
    if (forbidden) return forbidden;

    const body = (await req.json().catch(() => ({}))) as { id?: string; email?: string };
    const id = typeof body.id === 'string' ? body.id.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!id && !email) {
      return NextResponse.json({ error: 'Missing id/email' }, { status: 400 });
    }

    const user =
      (id
        ? await prisma.user.findUnique({ where: { id }, select: { id: true, role: true, serialNumber: true, createdAt: true } })
        : null) ||
      (email
        ? await prisma.user.findUnique({ where: { email }, select: { id: true, role: true, serialNumber: true, createdAt: true } })
        : null);

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const serialNumber = await assignUserSerial({
      id: user.id,
      role: user.role,
      serialNumber: user.serialNumber,
      createdAt: user.createdAt,
    });

    return NextResponse.json(
      { ok: true, id: user.id, serialNumber },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (e) {
    console.error('POST /api/admin/users/fix-serial', e);
    return NextResponse.json({ error: 'Failed to fix serial' }, { status: 500 });
  }
}

