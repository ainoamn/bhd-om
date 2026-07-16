import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import { importDatabaseSnapshot, SNAPSHOT_VERSION, type DatabaseSnapshotV2 } from '@/lib/server/dataBackupSnapshot';
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

    const ct = req.headers.get('content-type') || '';
    let pin: string | undefined;
    let snapshot: DatabaseSnapshotV2 | null = null;

    if (ct.includes('multipart/form-data')) {
      const form = await req.formData();
      pin = (form.get('pin') as string) || undefined;
      const file = form.get('file');
      if (file instanceof File) {
        const text = await file.text();
        snapshot = JSON.parse(text) as DatabaseSnapshotV2;
      }
    } else {
      const body = (await req.json().catch(() => null)) as { pin?: string; snapshot?: DatabaseSnapshotV2 } | null;
      pin = body?.pin;
      snapshot = body?.snapshot ?? null;
    }

    if (!(await verifyAdminDataPin(pin))) {
      return NextResponse.json(
        { error: 'INVALID_PIN', message: 'Security PIN is incorrect (min 8 characters).' },
        { status: 403 }
      );
    }
    if (!snapshot || snapshot.version !== SNAPSHOT_VERSION) {
      return NextResponse.json(
        { error: 'INVALID_SNAPSHOT', message: `Expected version ${SNAPSHOT_VERSION}` },
        { status: 400 }
      );
    }

    await importDatabaseSnapshot(prisma, snapshot);

    return NextResponse.json({ ok: true, message: 'Database restored from snapshot.' });
  } catch (e) {
    console.error('admin data restore:', e);
    const mapped = mapAdminDataPinError(e);
    if (mapped) {
      return NextResponse.json(
        { error: mapped.error, message: mapped.message },
        { status: mapped.status }
      );
    }
    return NextResponse.json(
      { error: 'RESTORE_FAILED', message: e instanceof Error ? e.message : 'unknown' },
      { status: 500 }
    );
  }
}
