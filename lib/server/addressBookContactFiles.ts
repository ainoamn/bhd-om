import path from 'path';
import { put } from '@vercel/blob';
import { prisma } from '@/lib/prisma';
import type { AddressBookFileRef, ContactAttachmentFiles } from '@/lib/data/addressBook';
import {
  LEGACY_FILE_SERVE_PREFIX,
  legacyAttachmentAlreadyOnServer as legacyStoredAttachmentOnServer,
} from '@/lib/server/legacyStoredFiles';

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
    url: addressBookFileServeUrl(row.id),
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
  const stored = legacyStoredAttachmentOnServer(att);
  if (stored) {
    const onAddressBook =
      stored.url.includes(ADDRESS_BOOK_FILE_SERVE_PREFIX) || /^https?:\/\//i.test(stored.url);
    return {
      fileId: stored.fileId,
      url: onAddressBook ? addressBookFileServeUrl(stored.fileId) : stored.url,
      fileName: stored.fileName,
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes,
    };
  }

  if (!att || typeof att !== 'object') return null;
  const o = att as Record<string, unknown>;
  const fileId = str(o.fileId);
  if (!fileId) return null;
  const url = str(o.url) || str(o.relativePath);
  const onLegacyGeneric = url.includes(LEGACY_FILE_SERVE_PREFIX);
  if (onLegacyGeneric) {
    return {
      fileId,
      url: url.startsWith('/') ? url : `${LEGACY_FILE_SERVE_PREFIX}/${encodeURIComponent(fileId)}`,
      fileName: str(o.name) || str(o.fileName) || 'attachment',
      mimeType: str(o.type) || str(o.mimeType) || undefined,
    };
  }
  if (/^https?:\/\//i.test(url) || str(o.storedOnDisk)) {
    return {
      fileId,
      url: addressBookFileServeUrl(fileId),
      fileName: str(o.name) || str(o.fileName) || 'attachment',
      mimeType: str(o.type) || str(o.mimeType) || undefined,
    };
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

const CONTACT_ATTACHMENT_FIELD_KEYS = new Set(['idCard', 'passport', 'commercialReg', 'leaseContract']);

/** يقرأ مرفقات جهة الاتصال من جدول AddressBookContactFile */
export async function loadContactAttachmentsFromDb(contactId: string): Promise<ContactAttachmentFiles> {
  const cid = str(contactId);
  if (!cid) return {};

  const rows = await prisma.addressBookContactFile.findMany({
    where: { contactId: cid },
    orderBy: { createdAt: 'desc' },
  });

  const out: ContactAttachmentFiles = {};
  for (const row of rows) {
    const fk = str(row.fieldKey);
    if (!fk || !CONTACT_ATTACHMENT_FIELD_KEYS.has(fk)) continue;
    const key = fk as keyof ContactAttachmentFiles;
    if (out[key]) continue;
    out[key] = fileRefFromRow(row);
  }
  return out;
}

function collectAttachmentFileIdsFromEntry(
  entry: Record<string, unknown>
): Array<{ fileId: string; fieldKey: string }> {
  const out: Array<{ fileId: string; fieldKey: string }> = [];
  const bags = [entry];
  const la = entry.legacyLocalAttachments;
  if (la && typeof la === 'object') bags.push(la as Record<string, unknown>);

  for (const bag of bags) {
    for (const [legacyKey, contactKey] of Object.entries(LEGACY_FIELD_TO_CONTACT_KEY)) {
      const att = bag[legacyKey];
      const fileId = str((att as Record<string, unknown>)?.fileId);
      if (fileId) out.push({ fileId, fieldKey: contactKey });
    }
  }
  return out;
}

/** يقرأ المرفقات من PostgreSQL (بـ contactId أو fileId المخزّن في JSON) */
export async function loadContactAttachmentsFromContactData(
  contactId: string,
  contactData: Record<string, unknown>
): Promise<ContactAttachmentFiles> {
  const cid = str(contactId);
  if (!cid) return {};

  await linkAddressBookFilesToContact(cid, contactData, null);
  const out = await loadContactAttachmentsFromDb(cid);

  for (const { fileId, fieldKey } of collectAttachmentFileIdsFromEntry(contactData)) {
    const key = fieldKey as keyof ContactAttachmentFiles;
    if (out[key]) continue;
    const row = await prisma.addressBookContactFile.findUnique({ where: { id: fileId } });
    if (!row) continue;
    if (!str(row.contactId)) {
      await prisma.addressBookContactFile.update({
        where: { id: fileId },
        data: { contactId: cid, fieldKey },
      });
    }
    out[key] = fileRefFromRow(row);
  }

  return out;
}

/** يربط ملفات مرفوعة (حتى بدون contactId) بجهة الاتصال */
export async function linkAddressBookFilesToContact(
  contactId: string,
  entry: Record<string, unknown>,
  attachments?: ContactAttachmentFiles | null
): Promise<void> {
  const cid = str(contactId);
  if (!cid) return;

  const seen = new Set<string>();
  const link = async (fileId: string, fieldKey: string) => {
    if (!fileId || seen.has(fileId)) return;
    seen.add(fileId);
    await prisma.addressBookContactFile.updateMany({
      where: { id: fileId },
      data: { contactId: cid, fieldKey },
    });
  };

  for (const [legacyKey, contactKey] of Object.entries(LEGACY_FIELD_TO_CONTACT_KEY)) {
    const att = entry[legacyKey];
    const fileId = str((att as Record<string, unknown>)?.fileId);
    if (fileId) await link(fileId, contactKey);
  }

  const la = entry.legacyLocalAttachments;
  if (la && typeof la === 'object') {
    for (const [legacyKey, contactKey] of Object.entries(LEGACY_FIELD_TO_CONTACT_KEY)) {
      const att = (la as Record<string, unknown>)[legacyKey];
      const fileId = str((att as Record<string, unknown>)?.fileId);
      if (fileId) await link(fileId, contactKey);
    }
  }

  if (attachments) {
    for (const [key, ref] of Object.entries(attachments)) {
      if (ref?.fileId) await link(ref.fileId, key);
    }
  }
}

/** يدمج المرفقات المحفوظة في JSON مع الملفات المرتبطة في PostgreSQL */
export async function mergeContactAttachmentsForContact(
  contactId: string,
  entry: Record<string, unknown>,
  persisted: ContactAttachmentFiles
): Promise<ContactAttachmentFiles> {
  await linkAddressBookFilesToContact(contactId, entry, persisted);
  const fromDb = await loadContactAttachmentsFromDb(contactId);
  return { ...fromDb, ...persisted };
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

  return mergeContactAttachmentsForContact(contactId, entry, out);
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
