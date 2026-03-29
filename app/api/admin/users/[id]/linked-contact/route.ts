/**
 * جهة الاتصال المرتبطة بمستخدم محدد — للمدير فقط، من قاعدة البيانات (نفس مصدر «حسابي»)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import { findAddressBookRowByUserId } from '@/lib/server/syncUserToAddressBook';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!token || (token.role as string) !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: userId } = await params;
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, serialNumber: true },
    });
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const row = await findAddressBookRowByUserId(userId);
    if (!row) {
      return NextResponse.json(null);
    }

    const data = { ...((row.data as Record<string, unknown>) || {}) };
    data.serialNumber = dbUser.serialNumber;
    data.userId = userId;
    return NextResponse.json(data);
  } catch (e) {
    console.error('admin linked-contact GET error:', e);
    return NextResponse.json({ error: 'Failed to load linked contact' }, { status: 500 });
  }
}
