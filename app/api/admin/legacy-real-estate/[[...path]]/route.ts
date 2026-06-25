import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRoles } from '@/lib/auth/guard';
import {
  contentTypeForLegacyFile,
  readLegacyRealEstateFile,
  readLegacyRealEstateHtmlWithBridge,
} from '@/lib/server/legacyRealEstateFiles';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ path?: string[] }> };

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const forbidden = requireRoles(auth, ['ADMIN', 'SUPER_ADMIN']);
    if (forbidden) return forbidden;

    const { path: segments } = await context.params;
    const fileName = segments?.length ? segments[segments.length - 1]! : 'bhd-real-estate.html';
    const isMainHtml = fileName === 'bhd-real-estate.html' || fileName.endsWith('.html');
    const body = isMainHtml
      ? await readLegacyRealEstateHtmlWithBridge(segments)
      : await readLegacyRealEstateFile(segments);

    return new NextResponse(new Uint8Array(body), {
      status: 200,
      headers: {
        'Content-Type': contentTypeForLegacyFile(fileName),
        'Cache-Control': 'private, max-age=300',
        'X-Content-Type-Options': 'nosniff',
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
