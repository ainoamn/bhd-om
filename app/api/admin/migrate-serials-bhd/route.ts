import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRoles } from '@/lib/auth/guard';
import { runMigrateSerialsToBhd } from '@/lib/server/migrateSerialsToBhd';

export const dynamic = 'force-dynamic';
/** ترحيل كامل قد يستغرق وقتاً على قواعد بيانات كبيرة */
export const maxDuration = 300;

/**
 * POST: تشغيل ترحيل الأرقام إلى BHD (إنتاج).
 * - يقتصر على ADMIN / SUPER_ADMIN.
 * - dryRun: true → معاينة بدون كتابة.
 * - dryRun: false → يتطلب { "confirm": "BHD-MIGRATE" } لتقليل التشغيل بالخطأ.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const forbidden = requireRoles(auth, ['ADMIN', 'SUPER_ADMIN']);
    if (forbidden) return forbidden;

    const body = (await req.json().catch(() => ({}))) as {
      dryRun?: boolean;
      confirm?: string;
    };
    const dryRun = Boolean(body.dryRun);
    if (!dryRun && body.confirm !== 'BHD-MIGRATE') {
      return NextResponse.json(
        {
          error: 'Confirmation required',
          hint: 'For real migration send JSON: { "dryRun": false, "confirm": "BHD-MIGRATE" }',
        },
        { status: 400 }
      );
    }

    const result = await runMigrateSerialsToBhd({ dryRun });
    return NextResponse.json(
      { ok: true, result },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (e) {
    console.error('POST /api/admin/migrate-serials-bhd', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Migration failed' },
      { status: 500 }
    );
  }
}
