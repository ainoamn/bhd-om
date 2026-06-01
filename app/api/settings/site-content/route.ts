import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRoles } from '@/lib/auth/guard';
import { getJsonSetting, upsertJsonSetting } from '@/lib/server/repositories/appSettingsRepo';
import { siteContent, type SiteContentStore } from '@/lib/data/siteContent';

const KEY = 'site_content_settings';

export async function GET() {
  try {
    const stored = await getJsonSetting<SiteContentStore | null>(KEY, null);
    const merged = stored ? { ...siteContent, ...stored, services: { ...siteContent.services, ...stored.services }, contact: { ...siteContent.contact, ...stored.contact } } : siteContent;
    return NextResponse.json(merged);
  } catch (e) {
    console.error('site-content GET error:', e);
    return NextResponse.json(siteContent, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const forbidden = requireRoles(auth, ['ADMIN', 'SUPER_ADMIN', 'COMPANY', 'ORG_MANAGER']);
    if (forbidden) return forbidden;
    const body = (await req.json().catch(() => null)) as SiteContentStore | null;
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }
    await upsertJsonSetting(KEY, body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('site-content POST error:', e);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
