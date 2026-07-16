import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import { exportDatabaseSnapshot } from '@/lib/server/dataBackupSnapshot';
import {
  ensureAdminDataPinReady,
  mapAdminDataPinError,
  verifyAdminDataPin,
} from '@/lib/server/adminDataPin';
import { getAuthSecret } from '@/lib/server/authSecret';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: getAuthSecret() });
    if (!token || token.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Admin session required' },
        { status: 401 }
      );
    }

    try {
      await ensureAdminDataPinReady();
    } catch (e) {
      const mapped = mapAdminDataPinError(e);
      if (mapped) {
        return NextResponse.json(
          { error: mapped.error, message: mapped.message },
          { status: mapped.status }
        );
      }
      throw e;
    }

    const body = (await req.json().catch(() => ({}))) as { pin?: string };
    if (!(await verifyAdminDataPin(body.pin))) {
      return NextResponse.json(
        { error: 'INVALID_PIN', message: 'Security PIN is incorrect (min 8 characters).' },
        { status: 403 }
      );
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
    const mapped = mapAdminDataPinError(e);
    if (mapped) {
      return NextResponse.json(
        { error: mapped.error, message: mapped.message },
        { status: mapped.status }
      );
    }
    return NextResponse.json(
      { error: 'BACKUP_FAILED', message: e instanceof Error ? e.message : 'Backup failed' },
      { status: 500 }
    );
  }
}
