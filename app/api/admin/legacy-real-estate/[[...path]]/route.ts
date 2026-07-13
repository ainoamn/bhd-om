import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import {
  buildLegacyBridgeMinimalPayload,
  resolveLegacyBridgeLocale,
} from '@/lib/server/legacyBridge';
import {
  contentTypeForLegacyFile,
  readLegacyRealEstateFileWithMeta,
  readLegacyRealEstateHtmlWithBridge,
} from '@/lib/server/legacyRealEstateFiles';
import { isAdminLikeRole } from '@/lib/auth/roles';

export const dynamic = 'force-dynamic';

const MONOLITH_HTML = 'bhd-real-estate.html';
const SHELL_HTML = 'bhd-real-estate-shell.html';

type HtmlCacheEntry = { body: Buffer; timestamp: number; etag: string };
const HTML_CACHE_TTL_MS = 300_000;
const _htmlCache = new Map<string, HtmlCacheEntry>();

function htmlCacheKey(fileName: string, locale: string, bridgeStatus: string, userId: string): string {
  return `${fileName}:${locale}:${bridgeStatus}:${userId}`;
}

function htmlCacheGet(key: string): HtmlCacheEntry | undefined {
  const entry = _htmlCache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.timestamp > HTML_CACHE_TTL_MS) {
    _htmlCache.delete(key);
    return undefined;
  }
  return entry;
}

function htmlCacheSet(key: string, body: Buffer): HtmlCacheEntry {
  const etag = `bhd-html-${Date.now().toString(36)}-${body.length.toString(16)}`;
  const entry: HtmlCacheEntry = { body, timestamp: Date.now(), etag };
  _htmlCache.set(key, entry);
  return entry;
}

function cacheControlForLegacyFile(fileName: string): string {
  const ext = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.')) : '';
  if (ext === '.html') {
    return 'private, max-age=0, must-revalidate, stale-while-revalidate=300';
  }
  if (ext === '.js' || ext === '.css') {
    return 'private, max-age=31536000, immutable, stale-while-revalidate=86400';
  }
  if (fileName === 'body-raw.html') {
    return 'private, max-age=3600, stale-while-revalidate=86400';
  }
  return 'private, max-age=3600, stale-while-revalidate=86400';
}

function isBridgeHtml(fileName: string): boolean {
  return fileName === MONOLITH_HTML || fileName === SHELL_HTML || fileName === 'bhd-real-estate-v2.html';
}

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

function notModified(req: NextRequest, etag: string): boolean {
  const inm = req.headers.get('if-none-match');
  return !!inm && inm === etag;
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
    const useMonolith = req.nextUrl.searchParams.get('monolith') === '1';
    const { path: segments } = await context.params;
    const fileName = segments?.length ? segments[segments.length - 1]! : MONOLITH_HTML;
    const servedHtmlName =
      fileName === MONOLITH_HTML && !useMonolith ? SHELL_HTML : fileName;

    let body: Buffer;
    let etag: string | undefined;
    let bridgeStatus = 'none';

    if (isBridgeHtml(fileName)) {
      const embedded = await buildLegacyBridgeMinimalPayload(userId, locale);
      bridgeStatus = embedded ? 'embedded' : 'empty';

      const cacheKey = htmlCacheKey(servedHtmlName, locale, bridgeStatus, userId);
      const cached = htmlCacheGet(cacheKey);
      if (cached) {
        if (notModified(req, cached.etag)) {
          return new NextResponse(null, {
            status: 304,
            headers: {
              'Cache-Control': cacheControlForLegacyFile(servedHtmlName),
              'X-Bhd-Bridge': bridgeStatus,
              'X-Bhd-Cache': 'HIT',
              'X-Bhd-Shell': useMonolith ? '0' : '1',
              ETag: cached.etag,
            },
          });
        }
        return new NextResponse(new Uint8Array(cached.body), {
          status: 200,
          headers: {
            'Content-Type': contentTypeForLegacyFile(servedHtmlName),
            'Cache-Control': cacheControlForLegacyFile(servedHtmlName),
            'X-Content-Type-Options': 'nosniff',
            'X-Bhd-Bridge': bridgeStatus,
            'X-Bhd-Cache': 'HIT',
            'X-Bhd-Shell': useMonolith ? '0' : '1',
            ETag: cached.etag,
          },
        });
      }

      body = await readLegacyRealEstateHtmlWithBridge(segments, embedded, useMonolith);
      const stored = htmlCacheSet(cacheKey, body);
      etag = stored.etag;
    } else {
      const file = await readLegacyRealEstateFileWithMeta(segments);
      body = file.body;
      etag = file.etag;
      if (notModified(req, etag)) {
        return new NextResponse(null, {
          status: 304,
          headers: {
            'Cache-Control': cacheControlForLegacyFile(file.fileName),
            ETag: etag,
          },
        });
      }
    }

    return new NextResponse(new Uint8Array(body), {
      status: 200,
      headers: {
        'Content-Type': contentTypeForLegacyFile(servedHtmlName || fileName),
        'Cache-Control': cacheControlForLegacyFile(servedHtmlName || fileName),
        'X-Content-Type-Options': 'nosniff',
        'X-Bhd-Bridge': bridgeStatus,
        'X-Bhd-Cache': 'MISS',
        'X-Bhd-Shell': fileName === MONOLITH_HTML && !useMonolith ? '1' : '0',
        ...(etag ? { ETag: etag } : {}),
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
