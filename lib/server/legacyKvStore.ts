import { prisma } from '@/lib/prisma';
import {
  isLegacyKvKey,
  isLegacyKvKeepOnFullWipe,
  legacyKvCategory,
  LEGACY_KV_KEEP_ON_FULL_WIPE,
  LEGACY_KV_WIPE_GUARD_KEY,
} from '@/lib/server/legacyKvKeys';
import { extractLegacyKvInlineBlobs, deleteLegacyStoredFilesForContexts } from '@/lib/server/legacyStoredFiles';
import { mergeLegacyKvOnPut } from '@/lib/server/legacyKvMerge';
import { legacyKvHasSubstantiveUserData } from '@/lib/server/legacyKvSubstantive';

const WIPE_GUARD_TTL_MS = 24 * 60 * 60 * 1000;

async function readLegacyKvWipeGuardUntil(): Promise<number> {
  const row = await prisma.legacyAppKvStore.findUnique({
    where: { kvKey: LEGACY_KV_WIPE_GUARD_KEY },
    select: { data: true },
  });
  if (!row?.data) return 0;
  try {
    const o = JSON.parse(row.data) as { until?: number };
    const until = typeof o?.until === 'number' ? o.until : 0;
    return Number.isFinite(until) ? until : 0;
  } catch {
    return 0;
  }
}

async function writeLegacyKvWipeGuard(): Promise<void> {
  const until = Date.now() + WIPE_GUARD_TTL_MS;
  await prisma.legacyAppKvStore.upsert({
    where: { kvKey: LEGACY_KV_WIPE_GUARD_KEY },
    create: {
      kvKey: LEGACY_KV_WIPE_GUARD_KEY,
      data: JSON.stringify({ until }),
      category: 'system',
    },
    update: {
      data: JSON.stringify({ until }),
      category: 'system',
      updatedAt: new Date(),
    },
  });
}

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

/** جلب مفاتيح bhd_* من PostgreSQL — يمكن تمرير keys لسحب جزئي أسرع */
export async function getLegacyKvBulk(prefix = 'bhd_', keys?: string[]): Promise<LegacyKvPullResult> {
  const validKeys = (keys || []).filter((k) => isLegacyKvKey(k));
  const rows = await prisma.legacyAppKvStore.findMany({
    where: validKeys.length
      ? { kvKey: { in: validKeys } }
      : { kvKey: { startsWith: prefix } },
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

export type PutLegacyKvBulkOptions = {
  /** استبدال كامل — يُستخدم بعد تصفية البيانات وليس الدمج */
  replace?: boolean;
};

/** حفظ دفعة مفاتيح — يُستخدم من النظام القديم بعد كل تعديل */
export async function putLegacyKvBulk(
  payload: LegacyKvBulkPayload,
  options?: PutLegacyKvBulkOptions
): Promise<{ saved: number }> {
  let saved = 0;
  const now = new Date();
  const replace = options?.replace === true;
  const wipeGuardUntil = await readLegacyKvWipeGuardUntil();
  const wipeGuardActive = wipeGuardUntil > Date.now();

  for (const [key, raw] of Object.entries(payload || {})) {
    if (!isLegacyKvKey(key)) continue;
    if (raw === null || raw === undefined) continue;
    const data = typeof raw === 'string' ? raw : JSON.stringify(raw);
    if (!data.length) continue;

    if (
      wipeGuardActive &&
      key !== (LEGACY_KV_WIPE_GUARD_KEY as string) &&
      !isLegacyKvKeepOnFullWipe(key) &&
      key !== 'bhd_address_book' &&
      legacyKvHasSubstantiveUserData(key, data)
    ) {
      continue;
    }

    let storedData = data;
    if (data.includes('data:')) {
      try {
        storedData = await extractLegacyKvInlineBlobs(key, data);
      } catch (eBlob) {
        console.warn('extractLegacyKvInlineBlobs', key, eBlob);
      }
    }

    let mergedData = storedData;
    if (!replace) {
      const existing = await prisma.legacyAppKvStore.findUnique({
        where: { kvKey: key },
        select: { data: true },
      });
      mergedData = mergeLegacyKvOnPut(key, existing?.data ?? null, storedData);
    }

    await prisma.legacyAppKvStore.upsert({
      where: { kvKey: key },
      create: {
        kvKey: key,
        data: mergedData,
        category: legacyKvCategory(key),
        updatedAt: now,
      },
      update: {
        data: mergedData,
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

/** تصفية — يحذف كل مفاتيح bhd_* من PostgreSQL ما عدا keepKeys */
export async function wipeLegacyKvExcept(keepKeys: string[] = []): Promise<{ removed: number }> {
  const keep = new Set(
    keepKeys.filter((k) => typeof k === 'string' && k.startsWith('bhd_'))
  );
  (LEGACY_KV_KEEP_ON_FULL_WIPE as readonly string[]).forEach((k) => keep.add(k));

  const where: { kvKey: { startsWith: string }; NOT?: { kvKey: { in: string[] } } } = {
    kvKey: { startsWith: 'bhd_' },
  };
  if (keep.size) {
    where.NOT = { kvKey: { in: [...keep] } };
  }

  const result = await prisma.legacyAppKvStore.deleteMany({ where });
  try {
    await deleteLegacyStoredFilesForContexts(['contract', 'property', 'registry', 'reservation', 'accounting']);
  } catch (_eWipeFiles) {}
  try {
    await writeLegacyKvWipeGuard();
  } catch (_eWipeGuard) {}
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
