import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { isAdminLikeRole } from '@/lib/auth/roles';
import { prisma } from '@/lib/prisma';
import { extractLegacyKvInlineBlobs } from '@/lib/server/legacyStoredFiles';

export const dynamic = 'force-dynamic';

/** ترحيل المرفقات المضمّنة (dataUrl) في PostgreSQL إلى ملفات منفصلة */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const roleOk = isAdminLikeRole(auth.role) || auth.role === 'ADMIN' || auth.role === 'SUPER_ADMIN';
    if (!roleOk) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const rows = await prisma.legacyAppKvStore.findMany({
      where: { data: { contains: 'data:' } },
    });

    let updated = 0;
    let blobsExtracted = 0;

    for (const row of rows) {
      const before = row.data;
      const cleaned = await extractLegacyKvInlineBlobs(row.kvKey, before);
      if (cleaned === before) continue;
      const beforeCount = (before.match(/data:[^"']+/g) || []).length;
      const afterCount = (cleaned.match(/data:[^"']+/g) || []).length;
      blobsExtracted += Math.max(0, beforeCount - afterCount);
      await prisma.legacyAppKvStore.update({
        where: { id: row.id },
        data: { data: cleaned, updatedAt: new Date() },
      });
      updated += 1;
    }

    return NextResponse.json({
      scanned: rows.length,
      updated,
      blobsExtracted,
    });
  } catch (error) {
    console.error('legacy kv extract-blobs error', error);
    return NextResponse.json({ error: 'Failed to extract blobs' }, { status: 500 });
  }
}
