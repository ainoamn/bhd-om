import fs from 'fs/promises';
import path from 'path';

const LEGACY_ROOT = path.join(process.cwd(), 'legacy', 'bhd-real-estate');

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
  const relative = (segments?.length ? segments.join('/') : 'bhd-real-estate.html').replace(/\\/g, '/');
  const normalized = path.posix.normalize(relative).replace(/^(\.\.(\/|$))+/, '');
  const full = path.resolve(LEGACY_ROOT, normalized);
  const rootResolved = path.resolve(LEGACY_ROOT);
  if (!full.startsWith(rootResolved + path.sep) && full !== rootResolved) {
    throw new Error('Invalid path');
  }
  return full;
}

export function contentTypeForLegacyFile(filePath: string): string {
  return MIME_BY_EXT[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}

export async function readLegacyRealEstateFile(segments: string[] | undefined): Promise<Buffer> {
  const full = resolveLegacyRealEstatePath(segments);
  return fs.readFile(full);
}

export async function readLegacyRealEstateHtmlWithBridge(segments: string[] | undefined): Promise<Buffer> {
  const { injectLegacySiteBridgeScript } = await import('@/lib/server/legacyBridge');
  const raw = await readLegacyRealEstateFile(segments);
  const html = injectLegacySiteBridgeScript(raw.toString('utf-8'));
  return Buffer.from(html, 'utf-8');
}
