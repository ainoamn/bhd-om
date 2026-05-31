import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRoles } from '@/lib/auth/guard';
import {
  getLegacyBookingSettingsStatus,
  purgeLegacyBookingSettingsKeys,
  PURGE_LEGACY_BOOKING_SETTINGS_CONFIRM,
  runFullLegacyBookingSettingsBackfill,
  verifyLegacyBookingSettingsFullyMigrated,
} from '@/lib/server/legacyBookingSettingsCleanup';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** GET: حالة legacy booking_documents_settings / booking_checks_settings */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const forbidden = requireRoles(auth, ['ADMIN', 'SUPER_ADMIN']);
    if (forbidden) return forbidden;

    const status = await getLegacyBookingSettingsStatus();
    return NextResponse.json(status, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (e) {
    console.error('GET /api/admin/legacy-booking-settings', e);
    return NextResponse.json({ error: 'Failed to read legacy status' }, { status: 500 });
  }
}

/**
 * POST actions:
 * - backfill: ترحيل كامل من AppSetting إلى الجداول
 * - purge: حذف مفاتيح legacy بعد التحقق — يتطلب confirm
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const forbidden = requireRoles(auth, ['ADMIN', 'SUPER_ADMIN']);
    if (forbidden) return forbidden;

    const body = (await req.json().catch(() => ({}))) as {
      action?: string;
      confirm?: string;
    };
    const action = String(body.action || '').trim();

    if (action === 'backfill') {
      const result = await runFullLegacyBookingSettingsBackfill();
      const status = await getLegacyBookingSettingsStatus();
      return NextResponse.json({ ok: true, ...result, status });
    }

    if (action === 'purge') {
      if (body.confirm !== PURGE_LEGACY_BOOKING_SETTINGS_CONFIRM) {
        return NextResponse.json(
          {
            error: 'Confirmation required',
            hint: `{ "action": "purge", "confirm": "${PURGE_LEGACY_BOOKING_SETTINGS_CONFIRM}" }`,
          },
          { status: 400 }
        );
      }
      await runFullLegacyBookingSettingsBackfill();
      const verify = await verifyLegacyBookingSettingsFullyMigrated();
      if (!verify.ok) {
        return NextResponse.json({ error: 'Legacy not fully migrated', verify }, { status: 409 });
      }
      const purged = await purgeLegacyBookingSettingsKeys();
      const status = await getLegacyBookingSettingsStatus();
      return NextResponse.json({ ...purged, status });
    }

    return NextResponse.json({ error: 'Unknown action. Use backfill or purge.' }, { status: 400 });
  } catch (e) {
    console.error('POST /api/admin/legacy-booking-settings', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Legacy settings operation failed' },
      { status: 500 }
    );
  }
}
