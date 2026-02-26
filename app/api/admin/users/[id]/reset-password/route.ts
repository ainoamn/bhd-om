import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hash } from 'bcryptjs';

function generateTempPassword(length = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let p = '';
  for (let i = 0; i < length; i++) p += chars[Math.floor(Math.random() * chars.length)];
  return p;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const tempPassword = generateTempPassword(10);
    await prisma.user.update({
      where: { id },
      data: { password: await hash(tempPassword, 10) },
    });

    return NextResponse.json({
      success: true,
      generatedPassword: tempPassword,
      serialNumber: user.serialNumber,
      email: user.email,
    });
  } catch (e) {
    console.error('Reset password error:', e);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}
