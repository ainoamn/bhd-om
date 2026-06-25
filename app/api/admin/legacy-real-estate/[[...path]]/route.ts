import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import {
  buildLegacyBridgeMinimalPayload,
  resolveLegacyBridgeLocale,
} from '@/lib/server/legacyBridge';
import {
  contentTypeForLegacyFile,
  readLegacyRealEstateFile,
  readLegacyRealEstateHtmlWithBridge,
} from '@/lib/server/legacyRealEstateFiles';
import { isAdminLikeRole } from '@/lib/auth/roles';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ path?: string[] }> };

function requireLegacyAdminAccess(
  auth: Exclude<Awaited<ReturnType<typeof requireAuth>>, NextResponse>
): NextResponse | null {
  const roleOk = isAdminLikeRole(auth.role) || auth.role === 'ADMIN' || auth.role === 'SUPER_ADMIN';
  if (!roleOk) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const forbidden = requireLegacyAdminAccess(auth);
    if (forbidden) return forbidden;

    const userId = auth.userId;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const locale = resolveLegacyBridgeLocale(req);
    const { path: segments } = await context.params;
    const fileName = segments?.length ? segments[segments.length - 1]! : 'bhd-real-estate.html';
    const isMainHtml = fileName === 'bhd-real-estate.html' || fileName.endsWith('.html');

    let body: Buffer;
    let bridgeStatus = 'none';
    if (isMainHtml) {
      const embedded = await buildLegacyBridgeMinimalPayload(userId, locale);
      bridgeStatus = embedded ? 'embedded' : 'empty';
      body = await readLegacyRealEstateHtmlWithBridge(segments, embedded);
    } else {
      body = await readLegacyRealEstateFile(segments);
    }

    return new NextResponse(new Uint8Array(body), {
      status: 200,
      headers: {
        'Content-Type': contentTypeForLegacyFile(fileName),
        'Cache-Control': 'private, no-store, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
        'X-Bhd-Bridge': bridgeStatus,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === 'Invalid path') {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    console.error('legacy-real-estate serve error', error);
    return NextResponse.json({ error: 'Failed to load legacy app' }, { status: 500 });
  }
}
