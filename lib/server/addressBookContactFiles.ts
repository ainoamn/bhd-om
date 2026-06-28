import path from 'path';
import { put } from '@vercel/blob';
import { prisma } from '@/lib/prisma';
import type { AddressBookFileRef, ContactAttachmentFiles } from '@/lib/data/addressBook';

const ALLOWED_EXT = /\.(pdf|jpg|jpeg|png|gif|webp)$/i;
const MAX_SIZE_MB = 12;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;
const useDb = !!process.env.VERCEL && !useBlob;

export const ADDRESS_BOOK_FILE_SERVE_PREFIX = '/api/admin/legacy-bridge/address-book/files';

export function addressBookFileServeUrl(fileId: string): string {
  return `${ADDRESS_BOOK_FILE_SERVE_PREFIX}/${encodeURIComponent(fileId)}`;
}

export function fileRefFromRow(row: {
  id: string;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  blobUrl: string | null;
}): AddressBookFileRef {
  return {
    fileId: row.id,
    url: row.blobUrl || addressBookFileServeUrl(row.id),
    fileName: row.fileName,
    mimeType: row.mimeType || undefined,
    sizeBytes: row.sizeBytes ?? undefined,
  };
}

export async function uploadAddressBookContactFile(
  buffer: Buffer,
  opts: {
    fileName: string;
    mimeType?: string | null;
    contactId?: string | null;
    fieldKey?: string | null;
  }
): Promise<AddressBookFileRef> {
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
    const pathname = `address-book/${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`;
    const blob = await put(pathname, buffer, {
      access: 'public',
      addRandomSuffix: true,
      contentType: opts.mimeType || undefined,
    });
    blobUrl = blob.url;
  } else if (useDb) {
    content = buffer;
  } else {
    content = buffer;
  }

  const row = await prisma.addressBookContactFile.create({
    data: {
      contactId: opts.contactId?.trim() || null,
      fieldKey: opts.fieldKey?.trim() || null,
      fileName: opts.fileName,
      mimeType: opts.mimeType || null,
      sizeBytes: buffer.length,
      blobUrl,
      content: content ? new Uint8Array(content) : null,
    },
  });

  return fileRefFromRow(row);
}

function str(v: unknown): string {
  return String(v ?? '').trim();
}

function extractDataUrlFromLegacyAttachment(att: unknown): string {
  if (!att || typeof att !== 'object') return '';
  const o = att as Record<string, unknown>;
  const du = str(o.dataUrl);
  if (du.startsWith('data:')) return du;
  const alt = str(o.attachmentDataUrl) || str(o.checkAttachmentDataUrl);
  return alt.startsWith('data:') ? alt : '';
}

function legacyAttachmentAlreadyOnServer(att: unknown): AddressBookFileRef | null {
  if (!att || typeof att !== 'object') return null;
  const o = att as Record<string, unknown>;
  const fileId = str(o.fileId);
  const url = str(o.url) || str(o.relativePath);
  if (fileId && url.includes(ADDRESS_BOOK_FILE_SERVE_PREFIX)) {
    return {
      fileId,
      url: url.startsWith('/') ? url : addressBookFileServeUrl(fileId),
      fileName: str(o.name) || str(o.fileName) || 'attachment',
      mimeType: str(o.type) || str(o.mimeType) || undefined,
    };
  }
  if (url.startsWith(ADDRESS_BOOK_FILE_SERVE_PREFIX)) {
    const id = url.split('/').pop() || fileId;
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

function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; mimeType: string } {
  const m = /^data:([^;,]+)?(?:;charset=[^;,]+)?;(base64,)([\s\S]+)$/i.exec(dataUrl);
  if (!m) throw new Error('invalid_data_url');
  const mimeType = m[1] || 'application/octet-stream';
  const buffer = Buffer.from(m[3], 'base64');
  return { buffer, mimeType };
}

const LEGACY_FIELD_TO_CONTACT_KEY: Record<string, keyof ContactAttachmentFiles> = {
  idAttachment: 'idCard',
  passportAttachment: 'passport',
  commercialRegAttachment: 'commercialReg',
  leaseContractAttachment: 'leaseContract',
};

export async function persistLegacyAttachmentToContactFile(
  att: unknown,
  contactId: string,
  legacyField: keyof typeof LEGACY_FIELD_TO_CONTACT_KEY
): Promise<AddressBookFileRef | null> {
  const existing = legacyAttachmentAlreadyOnServer(att);
  if (existing) return existing;

  const dataUrl = extractDataUrlFromLegacyAttachment(att);
  if (!dataUrl) return null;

  const o = att && typeof att === 'object' ? (att as Record<string, unknown>) : {};
  const { buffer, mimeType } = dataUrlToBuffer(dataUrl);
  const fileName = str(o.name) || `${legacyField}${mimeType.includes('pdf') ? '.pdf' : '.jpg'}`;

  return uploadAddressBookContactFile(buffer, {
    fileName,
    mimeType: str(o.type) || mimeType,
    contactId,
    fieldKey: LEGACY_FIELD_TO_CONTACT_KEY[legacyField],
  });
}

export async function persistContactAttachmentsFromLegacyEntry(
  entry: Record<string, unknown>,
  contactId: string,
  prev?: ContactAttachmentFiles | null
): Promise<ContactAttachmentFiles> {
  const out: ContactAttachmentFiles = { ...(prev || {}) };
  const pairs: Array<[keyof typeof LEGACY_FIELD_TO_CONTACT_KEY, keyof ContactAttachmentFiles]> = [
    ['idAttachment', 'idCard'],
    ['passportAttachment', 'passport'],
    ['commercialRegAttachment', 'commercialReg'],
    ['leaseContractAttachment', 'leaseContract'],
  ];

  for (const [legacyKey, contactKey] of pairs) {
    const att = entry[legacyKey];
    if (!att) continue;
    const onServer = legacyAttachmentAlreadyOnServer(att);
    if (onServer) {
      out[contactKey] = onServer;
      continue;
    }
    try {
      const saved = await persistLegacyAttachmentToContactFile(att, contactId, legacyKey);
      if (saved) out[contactKey] = saved;
    } catch (e) {
      console.warn('persistContactAttachmentsFromLegacyEntry', legacyKey, e);
    }
  }

  return out;
}

export function legacyAttachmentRefFromFileRef(ref?: AddressBookFileRef | null): Record<string, unknown> | null {
  if (!ref?.fileId) return null;
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

export function applyContactAttachmentsToLegacyEntry(
  entry: Record<string, unknown>,
  files?: ContactAttachmentFiles | null
): void {
  if (!files) return;
  const map: Array<[keyof ContactAttachmentFiles, string]> = [
    ['idCard', 'idAttachment'],
    ['passport', 'passportAttachment'],
    ['commercialReg', 'commercialRegAttachment'],
    ['leaseContract', 'leaseContractAttachment'],
  ];
  for (const [contactKey, legacyKey] of map) {
    const ref = legacyAttachmentRefFromFileRef(files[contactKey]);
    if (ref) entry[legacyKey] = ref;
  }
}
