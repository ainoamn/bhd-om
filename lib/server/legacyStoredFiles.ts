import path from 'path';
import { put } from '@vercel/blob';
import { prisma } from '@/lib/prisma';

const ALLOWED_EXT = /\.(pdf|jpg|jpeg|png|gif|webp)$/i;
const MAX_SIZE_MB = 12;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

export const LEGACY_FILE_SERVE_PREFIX = '/api/admin/legacy-bridge/files';

export const LEGACY_FILE_SERVE_PREFIXES = [
  LEGACY_FILE_SERVE_PREFIX,
  '/api/admin/legacy-bridge/address-book/files',
] as const;

export type LegacyStoredFileRef = {
  fileId: string;
  url: string;
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
};

function str(v: unknown): string {
  return String(v ?? '').trim();
}

export function legacyFileServeUrl(fileId: string): string {
  return `${LEGACY_FILE_SERVE_PREFIX}/${encodeURIComponent(fileId)}`;
}

export function fileRefFromLegacyStoredRow(row: {
  id: string;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  blobUrl: string | null;
}): LegacyStoredFileRef {
  return {
    fileId: row.id,
    url: row.blobUrl || legacyFileServeUrl(row.id),
    fileName: row.fileName,
    mimeType: row.mimeType || undefined,
    sizeBytes: row.sizeBytes ?? undefined,
  };
}

export function legacyAttachmentAlreadyOnServer(att: unknown): LegacyStoredFileRef | null {
  if (!att || typeof att !== 'object') return null;
  const o = att as Record<string, unknown>;
  const fileId = str(o.fileId) || str(o.checkAttachmentFileId) || str(o.attachmentFileId);
  const url = str(o.url) || str(o.relativePath) || str(o.checkAttachmentRelativePath) || str(o.attachmentRelativePath);
  const onServer = LEGACY_FILE_SERVE_PREFIXES.some((p) => url.includes(p));
  if (!onServer && !fileId) return null;
  if (fileId && onServer) {
    return {
      fileId,
      url: url.startsWith('/') ? url : legacyFileServeUrl(fileId),
      fileName: str(o.name) || str(o.fileName) || str(o.checkAttachmentName) || 'attachment',
      mimeType: str(o.type) || str(o.mimeType) || undefined,
    };
  }
  if (onServer) {
    const id = decodeURIComponent(url.split('/').pop() || fileId);
    if (id) {
      return {
        fileId: id,
        url,
        fileName: str(o.name) || 'attachment',
        mimeType: str(o.type) || undefined,
      };
    }
  }
  return null;
}

export function extractDataUrlFromLegacyAttachment(att: unknown): string {
  if (!att || typeof att !== 'object') return '';
  const o = att as Record<string, unknown>;
  const fields = [o.dataUrl, o.attachmentDataUrl, o.checkAttachmentDataUrl, o.depositAttachmentDataUrl];
  for (const f of fields) {
    const du = str(f);
    if (du.startsWith('data:')) return du;
  }
  return '';
}

export function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; mimeType: string } {
  const m = /^data:([^;,]+)?(?:;charset=[^;,]+)?;(base64,)([\s\S]+)$/i.exec(dataUrl);
  if (!m) throw new Error('invalid_data_url');
  const mimeType = m[1] || 'application/octet-stream';
  const buffer = Buffer.from(m[3], 'base64');
  return { buffer, mimeType };
}

function guessFileName(att: Record<string, unknown>, fieldKey: string, mimeType: string): string {
  const base = str(att.name) || str(att.fileName) || str(att.checkAttachmentName) || fieldKey || 'attachment';
  if (/\.[a-z0-9]{2,5}$/i.test(base)) return base.slice(0, 180);
  const ext = mimeType.includes('pdf') ? '.pdf' : mimeType.includes('png') ? '.png' : '.jpg';
  return `${base}${ext}`.slice(0, 180);
}

export async function uploadLegacyStoredFile(
  buffer: Buffer,
  opts: {
    fileName: string;
    mimeType?: string | null;
    storeContext?: string | null;
    storeKey?: string | null;
    fieldKey?: string | null;
  }
): Promise<LegacyStoredFileRef> {
  const ext = path.extname(opts.fileName) || '';
  if (!ALLOWED_EXT.test(ext)) {
    throw new Error('file_type_not_allowed');
  }
  if (buffer.length > MAX_SIZE_BYTES) {
    throw new Error('file_too_large');
  }

  let blobUrl: string | null = null;
  let content: Buffer | null = null;

  if (useBlob) {
    const pathname = `legacy/${opts.storeContext || 'misc'}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`;
    const blob = await put(pathname, buffer, {
      access: 'public',
      addRandomSuffix: true,
      contentType: opts.mimeType || undefined,
    });
    blobUrl = blob.url;
  } else {
    content = buffer;
  }

  const row = await prisma.legacyStoredFile.create({
    data: {
      storeContext: opts.storeContext?.trim() || null,
      storeKey: opts.storeKey?.trim() || null,
      fieldKey: opts.fieldKey?.trim() || null,
      fileName: opts.fileName,
      mimeType: opts.mimeType || null,
      sizeBytes: buffer.length,
      blobUrl,
      content: content ? new Uint8Array(content) : null,
    },
  });

  return fileRefFromLegacyStoredRow(row);
}

export function legacyAttachmentRefFromFileRef(ref: LegacyStoredFileRef): Record<string, unknown> {
  return {
    name: ref.fileName,
    type: ref.mimeType || '',
    fileId: ref.fileId,
    url: ref.url,
    relativePath: ref.url,
    storedOnDisk: true,
    dataUrl: '',
  };
}

/** يحوّل مرجع مرفق (dataUrl) إلى ملف على الخادم */
export async function persistLegacyAttachmentToStoredFile(
  att: unknown,
  opts: {
    storeContext?: string;
    storeKey?: string;
    fieldKey?: string;
  }
): Promise<Record<string, unknown> | null> {
  const existing = legacyAttachmentAlreadyOnServer(att);
  if (existing) return legacyAttachmentRefFromFileRef(existing);

  const dataUrl = extractDataUrlFromLegacyAttachment(att);
  if (!dataUrl) return null;

  const o = att && typeof att === 'object' ? (att as Record<string, unknown>) : {};
  const { buffer, mimeType } = dataUrlToBuffer(dataUrl);
  const fileName = guessFileName(o, opts.fieldKey || 'attachment', mimeType);

  const saved = await uploadLegacyStoredFile(buffer, {
    fileName,
    mimeType: str(o.type) || mimeType,
    storeContext: opts.storeContext,
    storeKey: opts.storeKey,
    fieldKey: opts.fieldKey,
  });

  return legacyAttachmentRefFromFileRef(saved);
}

function looksLikeInlineAttachmentObject(o: Record<string, unknown>): boolean {
  const du = extractDataUrlFromLegacyAttachment(o);
  if (!du.startsWith('data:')) return false;
  if (legacyAttachmentAlreadyOnServer(o)) return false;
  const hasName =
    str(o.name) ||
    str(o.fileName) ||
    str(o.checkAttachmentName) ||
    str(o.attachmentName) ||
    str(o.docType) ||
    str(o.category);
  return !!(hasName || du.length > 200);
}

const MAX_BLOB_EXTRACTIONS_PER_KV = 80;

/** يمشي JSON ويستبدل dataUrl بمراجع ملفات على الخادم */
export async function extractInlineBlobsFromJsonValue(
  value: unknown,
  ctx: { kvKey: string; storeContext: string; storeKeyPrefix: string },
  state: { count: number; path: string }
): Promise<unknown> {
  if (state.count >= MAX_BLOB_EXTRACTIONS_PER_KV) return value;

  if (Array.isArray(value)) {
    const out: unknown[] = [];
    for (let i = 0; i < value.length; i++) {
      out.push(
        await extractInlineBlobsFromJsonValue(value[i], ctx, {
          ...state,
          path: `${state.path}[${i}]`,
        })
      );
    }
    return out;
  }

  if (value && typeof value === 'object') {
    const o = value as Record<string, unknown>;
    if (looksLikeInlineAttachmentObject(o)) {
      state.count += 1;
      const fieldKey = state.path.split('.').pop() || state.path || 'attachment';
      const persisted = await persistLegacyAttachmentToStoredFile(o, {
        storeContext: ctx.storeContext,
        storeKey: ctx.storeKeyPrefix,
        fieldKey,
      });
      if (persisted) return persisted;
      return value;
    }
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(o)) {
      out[k] = await extractInlineBlobsFromJsonValue(v, ctx, {
        ...state,
        path: state.path ? `${state.path}.${k}` : k,
      });
    }
    return out;
  }

  return value;
}

function kvKeyToStoreContext(kvKey: string): string {
  if (kvKey.includes('contract') || kvKey.includes('tenancy')) return 'contract';
  if (kvKey.includes('building') || kvKey.includes('managed_units') || kvKey.includes('owner')) return 'property';
  if (kvKey === 'bhd_file_registry') return 'registry';
  if (kvKey.includes('reservation') || kvKey.includes('eviction')) return 'reservation';
  if (kvKey.includes('accounting')) return 'accounting';
  return 'system';
}

/** يُنظّف JSON داخل قيمة KV من dataUrl ويحفظ الملفات في PostgreSQL */
export async function extractLegacyKvInlineBlobs(kvKey: string, rawJson: string): Promise<string> {
  if (!rawJson.includes('data:')) return rawJson;
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return rawJson;
  }

  const storeContext = kvKeyToStoreContext(kvKey);
  const processed = await extractInlineBlobsFromJsonValue(
    parsed,
    {
      kvKey,
      storeContext,
      storeKeyPrefix: kvKey,
    },
    { count: 0, path: '' }
  );

  try {
    return JSON.stringify(processed);
  } catch {
    return rawJson;
  }
}

export async function deleteLegacyStoredFilesForContexts(contexts: string[]): Promise<number> {
  if (!contexts.length) return 0;
  const result = await prisma.legacyStoredFile.deleteMany({
    where: { storeContext: { in: contexts } },
  });
  return result.count;
}
