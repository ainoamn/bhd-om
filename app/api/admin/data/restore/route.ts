import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import { importDatabaseSnapshot, SNAPSHOT_VERSION, type DatabaseSnapshotV2 } from '@/lib/server/dataBackupSnapshot';
import { isAdminDataPinConfigured, verifyAdminDataPin } from '@/lib/server/adminDataPin';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || token.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAdminDataPinConfigured()) {
      return NextResponse.json(
        { error: 'DATA_RESET_PIN_NOT_CONFIGURED', message: 'Set ADMIN_DATA_RESET_PIN (8+ chars) in environment.' },
        { status: 503 }
      );
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

    if (!verifyAdminDataPin(pin)) {
      return NextResponse.json({ error: 'INVALID_PIN' }, { status: 403 });
    }
    if (!snapshot || snapshot.version !== SNAPSHOT_VERSION) {
      return NextResponse.json({ error: 'INVALID_SNAPSHOT', message: `Expected version ${SNAPSHOT_VERSION}` }, { status: 400 });
    }

    await importDatabaseSnapshot(prisma, snapshot);

    return NextResponse.json({ ok: true, message: 'Database restored from snapshot.' });
  } catch (e) {
    console.error('admin data restore:', e);
    return NextResponse.json(
      { error: 'RESTORE_FAILED', message: e instanceof Error ? e.message : 'unknown' },
      { status: 500 }
    );
  }
}
