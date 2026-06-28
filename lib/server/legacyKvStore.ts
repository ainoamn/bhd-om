import { prisma } from '@/lib/prisma';
import {
  isLegacyKvKey,
  legacyKvCategory,
  LEGACY_KV_ALL_KEYS,
  isLegacyKvKeepOnFullWipe,
} from '@/lib/server/legacyKvKeys';
import { extractLegacyKvInlineBlobs, deleteLegacyStoredFilesForContexts } from '@/lib/server/legacyStoredFiles';

export type LegacyKvBulkPayload = Record<string, string>;

export type LegacyKvPullResult = LegacyKvBulkPayload & {
  _meta?: Record<string, { updatedAt: string }>;
};

function rowToEntry(row: { kvKey: string; data: string; updatedAt: Date }) {
  return {
    key: row.kvKey,
    data: row.data,
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** جلب مفاتيح bhd_* من PostgreSQL */
export async function getLegacyKvBulk(prefix = 'bhd_'): Promise<LegacyKvPullResult> {
  const rows = await prisma.legacyAppKvStore.findMany({
    where: { kvKey: { startsWith: prefix } },
    orderBy: { kvKey: 'asc' },
  });

  const out: LegacyKvPullResult = {};
  const meta: Record<string, { updatedAt: string }> = {};

  rows.forEach((row) => {
    if (!isLegacyKvKey(row.kvKey)) return;
    out[row.kvKey] = row.data;
    meta[row.kvKey] = { updatedAt: row.updatedAt.toISOString() };
  });

  if (Object.keys(meta).length) out._meta = meta;
  return out;
}

/** حفظ دفعة مفاتيح — يُستخدم من النظام القديم بعد كل تعديل */
export async function putLegacyKvBulk(payload: LegacyKvBulkPayload): Promise<{ saved: number }> {
  let saved = 0;
  const now = new Date();

  for (const [key, raw] of Object.entries(payload || {})) {
    if (!isLegacyKvKey(key)) continue;
    if (raw === null || raw === undefined) continue;
    const data = typeof raw === 'string' ? raw : JSON.stringify(raw);
    if (!data.length) continue;

    let storedData = data;
    if (data.includes('data:')) {
      try {
        storedData = await extractLegacyKvInlineBlobs(key, data);
      } catch (eBlob) {
        console.warn('extractLegacyKvInlineBlobs', key, eBlob);
      }
    }

    await prisma.legacyAppKvStore.upsert({
      where: { kvKey: key },
      create: {
        kvKey: key,
        data: storedData,
        category: legacyKvCategory(key),
        updatedAt: now,
      },
      update: {
        data: storedData,
        category: legacyKvCategory(key),
        updatedAt: now,
      },
    });
    saved += 1;
  }

  return { saved };
}

/** حذف مفاتيح محددة */
export async function clearLegacyKvKeys(keys: string[]): Promise<{ removed: number }> {
  const valid = keys.filter((k) => isLegacyKvKey(k));
  if (!valid.length) return { removed: 0 };
  const result = await prisma.legacyAppKvStore.deleteMany({
    where: { kvKey: { in: valid } },
  });
  return { removed: result.count };
}

/** تصفية — يحذف كل شيء ما عدا keepKeys */
export async function wipeLegacyKvExcept(keepKeys: string[] = []): Promise<{ removed: number }> {
  const keep = new Set(keepKeys.filter((k) => isLegacyKvKey(k) || isLegacyKvKeepOnFullWipe(k)));
  LEGACY_KV_ALL_KEYS.forEach((k) => {
    if (isLegacyKvKeepOnFullWipe(k)) keep.add(k);
  });

  const toRemove = LEGACY_KV_ALL_KEYS.filter((k) => !keep.has(k));
  if (!toRemove.length) return { removed: 0 };

  const result = await prisma.legacyAppKvStore.deleteMany({
    where: { kvKey: { in: [...toRemove] } },
  });
  try {
    await deleteLegacyStoredFilesForContexts(['contract', 'property', 'registry', 'reservation', 'accounting']);
  } catch (_eWipeFiles) {}
  return { removed: result.count };
}

/** استيراد أولي — يملأ فقط المفاتيح غير الموجودة */
export async function seedLegacyKvIfMissing(payload: LegacyKvBulkPayload): Promise<number> {
  let seeded = 0;
  for (const [key, data] of Object.entries(payload)) {
    if (!isLegacyKvKey(key) || typeof data !== 'string' || !data.trim()) continue;
    const exists = await prisma.legacyAppKvStore.findUnique({ where: { kvKey: key } });
    if (exists) continue;
    await prisma.legacyAppKvStore.create({
      data: {
        kvKey: key,
        data,
        category: legacyKvCategory(key),
      },
    });
    seeded += 1;
  }
  return seeded;
}

export { rowToEntry };
