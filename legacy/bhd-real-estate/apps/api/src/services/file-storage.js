import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { config } from '../config.js';

const VALID_CATEGORIES = new Set([
  'deposit',
  'cheques',
  'vat-cheques',
  'mandatory',
  'other',
  'addressbook',
]);

let _s3Client = null;

function s3Enabled() {
  return !!(config.s3.bucket && config.s3.accessKeyId && config.s3.secretAccessKey);
}

async function getS3Client() {
  if (!s3Enabled()) return null;
  if (_s3Client) return _s3Client;
  const { S3Client } = await import('@aws-sdk/client-s3');
  _s3Client = new S3Client({
    region: config.s3.region || 'auto',
    endpoint: config.s3.endpoint || undefined,
    credentials: {
      accessKeyId: config.s3.accessKeyId,
      secretAccessKey: config.s3.secretAccessKey,
    },
    forcePathStyle: !!config.s3.endpoint,
  });
  return _s3Client;
}

function sanitizeSegment(raw) {
  const s = String(raw == null ? '' : raw).trim();
  if (!s) return '_';
  return (
    s
      .replace(/[<>:"|?*\x00-\x1f]/g, '_')
      .replace(/[/\\]+/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^\.+/, '')
      .slice(0, 120) || '_'
  );
}

function normalizeCategory(category) {
  const c = String(category || 'other').trim().toLowerCase();
  return VALID_CATEGORIES.has(c) ? c : 'other';
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function decodeDataUrl(dataUrl) {
  const s = String(dataUrl || '');
  const m = s.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return { mime: 'application/octet-stream', buffer: Buffer.alloc(0) };
  return { mime: m[1], buffer: Buffer.from(m[2], 'base64') };
}

function safeFileName(name) {
  const base = path.basename(String(name || 'file'));
  const ext = path.extname(base);
  const stem = sanitizeSegment(path.basename(base, ext)) || 'file';
  return `${stem}${ext}`.slice(0, 180);
}

export function getFileStorageRoot() {
  const root = path.resolve(config.fileStorageDir);
  ensureDir(root);
  return root;
}

export function buildStorageKey(companyId, meta) {
  const b = sanitizeSegment(meta.building);
  const u = sanitizeSegment(meta.unit);
  const ag = sanitizeSegment(meta.agreementNo) || '_draft';
  const cat = normalizeCategory(meta.category);
  const fileName = safeFileName(meta.fileName);
  const unique = `${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
  return `companies/${companyId}/buildings/${b}/units/${u}/contracts/${ag}/attachments/${cat}/${unique}_${fileName}`;
}

export function absolutePathForStorageKey(storageKey) {
  return path.join(getFileStorageRoot(), storageKey.split('/').join(path.sep));
}

async function putObject(storageKey, buffer, mimeType) {
  if (s3Enabled()) {
    const client = await getS3Client();
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    await client.send(
      new PutObjectCommand({
        Bucket: config.s3.bucket,
        Key: storageKey,
        Body: buffer,
        ContentType: mimeType || 'application/octet-stream',
      })
    );
    return;
  }
  const abs = absolutePathForStorageKey(storageKey);
  ensureDir(path.dirname(abs));
  fs.writeFileSync(abs, buffer);
}

async function getObject(storageKey) {
  if (s3Enabled()) {
    const client = await getS3Client();
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const out = await client.send(
      new GetObjectCommand({ Bucket: config.s3.bucket, Key: storageKey })
    );
    const chunks = [];
    for await (const chunk of out.Body) chunks.push(chunk);
    return Buffer.concat(chunks);
  }
  const abs = absolutePathForStorageKey(storageKey);
  if (!fs.existsSync(abs)) return null;
  return fs.readFileSync(abs);
}

async function deleteObject(storageKey) {
  if (s3Enabled()) {
    const client = await getS3Client();
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    await client.send(new DeleteObjectCommand({ Bucket: config.s3.bucket, Key: storageKey }));
    return;
  }
  const abs = absolutePathForStorageKey(storageKey);
  if (fs.existsSync(abs)) fs.unlinkSync(abs);
}

export async function saveFileFromDataUrl(companyId, meta, dataUrl) {
  const { mime, buffer } = decodeDataUrl(dataUrl);
  const storageKey = buildStorageKey(companyId, meta);
  const mimeType = meta.mimeType || mime;
  await putObject(storageKey, buffer, mimeType);
  return {
    storageKey,
    mimeType,
    byteSize: buffer.length,
    fileName: safeFileName(meta.fileName),
  };
}

export async function readFileByStorageKey(storageKey) {
  return getObject(storageKey);
}

export async function deleteFileByStorageKey(storageKey) {
  await deleteObject(storageKey);
}

export function getStorageBackend() {
  return s3Enabled() ? 's3' : 'local';
}
