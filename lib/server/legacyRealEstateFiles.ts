import fs from 'fs/promises';
import path from 'path';
import { createHash } from 'crypto';
import type { LegacyBridgePayload } from '@/lib/server/legacyBridge';
import { injectLegacySiteBridgeScript } from '@/lib/server/legacyBridge';

const LEGACY_ROOT = path.join(process.cwd(), 'legacy', 'bhd-real-estate');

const SHELL_HTML = 'bhd-real-estate-shell.html';
const MONOLITH_HTML = 'bhd-real-estate.html';

let _mainHtmlCache: { buf: Buffer; mtimeMs: number } | null = null;
const _staticFileCache = new Map<string, { buf: Buffer; mtimeMs: number }>();

const MIME_BY_EXT: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

export function resolveLegacyRealEstatePath(segments: string[] | undefined): string {
  const relative = (segments?.length ? segments.join('/') : MONOLITH_HTML).replace(/\\/g, '/');
  const normalized = path.posix.normalize(relative).replace(/^(\.\.(\/|$))+/, '');
  const full = path.resolve(LEGACY_ROOT, normalized);
  const rootResolved = path.resolve(LEGACY_ROOT);
  if (!full.startsWith(rootResolved + path.sep) && full !== rootResolved) {
    throw new Error('Invalid path');
  }
  return full;
}

/** Default entry serves lightweight shell; ?monolith=1 serves full monolith. */
export function resolveLegacyMainHtmlSegments(
  segments: string[] | undefined,
  useMonolith: boolean
): string[] {
  const file = segments?.length ? segments[segments.length - 1]! : MONOLITH_HTML;
  if (file !== MONOLITH_HTML && file !== SHELL_HTML) {
    return segments?.length ? [...segments] : [MONOLITH_HTML];
  }
  if (useMonolith) {
    return segments?.length ? [...segments] : [MONOLITH_HTML];
  }
  if (!segments?.length) return [SHELL_HTML];
  const next = [...segments];
  next[next.length - 1] = SHELL_HTML;
  return next;
}

export function contentTypeForLegacyFile(filePath: string): string {
  return MIME_BY_EXT[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}

export function etagForLegacyBuffer(buf: Buffer, mtimeMs: number): string {
  const hash = createHash('sha1').update(buf).digest('hex').slice(0, 16);
  return `"bhd-${mtimeMs.toString(36)}-${hash}"`;
}

export type LegacyFileReadResult = {
  body: Buffer;
  mtimeMs: number;
  etag: string;
  fileName: string;
};

export async function readLegacyRealEstateFileWithMeta(
  segments: string[] | undefined
): Promise<LegacyFileReadResult> {
  const full = resolveLegacyRealEstatePath(segments);
  const fileName = path.basename(full);
  const stat = await fs.stat(full);
  const cacheKey = full;

  if (fileName === MONOLITH_HTML) {
    if (_mainHtmlCache && _mainHtmlCache.mtimeMs === stat.mtimeMs) {
      const body = _mainHtmlCache.buf;
      return { body, mtimeMs: stat.mtimeMs, etag: etagForLegacyBuffer(body, stat.mtimeMs), fileName };
    }
    const buf = await fs.readFile(full);
    _mainHtmlCache = { buf, mtimeMs: stat.mtimeMs };
    return { body: buf, mtimeMs: stat.mtimeMs, etag: etagForLegacyBuffer(buf, stat.mtimeMs), fileName };
  }

  const cached = _staticFileCache.get(cacheKey);
  if (cached && cached.mtimeMs === stat.mtimeMs) {
    return {
      body: cached.buf,
      mtimeMs: stat.mtimeMs,
      etag: etagForLegacyBuffer(cached.buf, stat.mtimeMs),
      fileName,
    };
  }

  const buf = await fs.readFile(full);
  _staticFileCache.set(cacheKey, { buf, mtimeMs: stat.mtimeMs });
  return { body: buf, mtimeMs: stat.mtimeMs, etag: etagForLegacyBuffer(buf, stat.mtimeMs), fileName };
}

export async function readLegacyRealEstateFile(segments: string[] | undefined): Promise<Buffer> {
  const { body } = await readLegacyRealEstateFileWithMeta(segments);
  return body;
}

export async function readLegacyRealEstateHtmlWithBridge(
  segments: string[] | undefined,
  embeddedPayload?: LegacyBridgePayload | null,
  useMonolith = false
): Promise<Buffer> {
  const resolved = resolveLegacyMainHtmlSegments(segments, useMonolith);
  const raw = await readLegacyRealEstateFile(resolved);
  let html = injectLegacySiteBridgeScript(raw.toString('utf-8'), embeddedPayload ?? null);
  const servedName = resolved[resolved.length - 1] ?? '';
  if (servedName === SHELL_HTML) {
    html = await injectLegacyShellAssetVersions(html);
  }
  return Buffer.from(html, 'utf-8');
}

let _shellAssetVersionsCache: { stamp: string; at: number } | null = null;
const SHELL_ASSET_VERSION_TTL_MS = 60_000;

async function legacyAssetVersionToken(relativePath: string): Promise<string> {
  const stat = await fs.stat(path.join(LEGACY_ROOT, relativePath));
  return stat.mtimeMs.toString(36);
}

/** Cache-bust query params on shell asset URLs when split files change. */
export async function injectLegacyShellAssetVersions(html: string): Promise<string> {
  const now = Date.now();
  if (!_shellAssetVersionsCache || now - _shellAssetVersionsCache.at > SHELL_ASSET_VERSION_TTL_MS) {
    const [cssV, jsV, bodyV] = await Promise.all([
      legacyAssetVersionToken('css/main.css'),
      legacyAssetVersionToken('js/app-main.js'),
      legacyAssetVersionToken('modules/body-raw.html'),
    ]);
    _shellAssetVersionsCache = { stamp: `${cssV}.${jsV}.${bodyV}`, at: now };
  }
  const [cssV, jsV, bodyV] = _shellAssetVersionsCache.stamp.split('.');
  return html
    .replace(/\/css\/main\.css(?=["'])/g, `/css/main.css?v=${cssV}`)
    .replace(/\/js\/app-main\.js(?=["'])/g, `/js/app-main.js?v=${jsV}`)
    .replace(/\/modules\/body-raw\.html(?=["'])/g, `/modules/body-raw.html?v=${bodyV}`);
}
