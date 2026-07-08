/**
 * التحقق من اتصال PostgreSQL — في الإنتاج: ADMIN فقط
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminForDiagnostics } from '@/lib/server/adminAccess';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const blocked = await requireAdminForDiagnostics(req);
  if (blocked) return blocked;

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      database: 'متصل بنجاح',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        ok: false,
        database: 'غير متصل أو خطأ',
        error: process.env.NODE_ENV === 'production' ? 'Database error' : message,
      },
      { status: 503 }
    );
  }
}
