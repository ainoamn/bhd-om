import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRoles } from '@/lib/auth/guard';
import { getJsonSetting, upsertJsonSetting } from '@/lib/server/repositories/appSettingsRepo';
import { DEFAULT_COMMUNICATION_TEMPLATES, type CommunicationTemplatesStore } from '@/lib/data/communicationTemplates';

const KEY = 'communication_templates_settings';

function mergeStore(stored: Partial<CommunicationTemplatesStore> | null): CommunicationTemplatesStore {
  if (!stored) return DEFAULT_COMMUNICATION_TEMPLATES;
  return {
    messages: stored.messages?.length ? stored.messages : DEFAULT_COMMUNICATION_TEMPLATES.messages,
    alerts: stored.alerts?.length ? stored.alerts : DEFAULT_COMMUNICATION_TEMPLATES.alerts,
    notifications: stored.notifications?.length ? stored.notifications : DEFAULT_COMMUNICATION_TEMPLATES.notifications,
  };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const stored = await getJsonSetting<Partial<CommunicationTemplatesStore> | null>(KEY, null);
    return NextResponse.json(mergeStore(stored));
  } catch (e) {
    console.error('communication-templates GET error:', e);
    return NextResponse.json(DEFAULT_COMMUNICATION_TEMPLATES, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const forbidden = requireRoles(auth, ['ADMIN', 'SUPER_ADMIN', 'COMPANY', 'ORG_MANAGER']);
    if (forbidden) return forbidden;
    const body = (await req.json().catch(() => null)) as Partial<CommunicationTemplatesStore> | null;
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }
    await upsertJsonSetting(KEY, mergeStore(body));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('communication-templates POST error:', e);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
