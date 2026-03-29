import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import { exportDatabaseSnapshot } from '@/lib/server/dataBackupSnapshot';
import { ensureAdminDataPinReady, verifyAdminDataPin } from '@/lib/server/adminDataPin';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await ensureAdminDataPinReady();

    const body = (await req.json().catch(() => ({}))) as { pin?: string };
    if (!(await verifyAdminDataPin(body.pin))) {
      return NextResponse.json({ error: 'INVALID_PIN' }, { status: 403 });
    }

    const snapshot = await exportDatabaseSnapshot(prisma);
    const json = JSON.stringify(snapshot, null, 2);
    const name = `bhd-db-backup-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`;

    return new NextResponse(json, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${name}"`,
      },
    });
  } catch (e) {
    console.error('admin data backup:', e);
    return NextResponse.json({ error: 'BACKUP_FAILED' }, { status: 500 });
  }
}
