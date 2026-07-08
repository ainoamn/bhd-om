import { Prisma } from '@prisma/client';
import {
  deserializeLegacyKvData,
  isEncryptedLegacyKvData,
  serializeLegacyKvData,
} from '@/lib/server/legacyKvCrypto';

type JsonRecord = Record<string, unknown>;

function encryptDataField(value: unknown): unknown {
  if (typeof value !== 'string' || !value.length) return value;
  if (isEncryptedLegacyKvData(value)) return value;
  return serializeLegacyKvData(value);
}

function patchLegacyKvWriteArgs(args: Record<string, unknown>): void {
  if (args.data !== undefined && typeof args.data === 'object' && !Array.isArray(args.data)) {
    const d = args.data as JsonRecord;
    if (typeof d.data === 'string') {
      d.data = encryptDataField(d.data);
    }
  }
  for (const key of ['create', 'update'] as const) {
    const block = args[key];
    if (block && typeof block === 'object' && !Array.isArray(block)) {
      const b = block as JsonRecord;
      if (typeof b.data === 'string') {
        b.data = encryptDataField(b.data);
      }
    }
  }
  if (Array.isArray(args.data)) {
    args.data = (args.data as JsonRecord[]).map((row) => {
      if (typeof row.data === 'string') {
        return { ...row, data: encryptDataField(row.data) };
      }
      return row;
    });
  }
}

function decryptLegacyKvRow(row: unknown): unknown {
  if (!row || typeof row !== 'object') return row;
  const r = row as { data?: string };
  if (typeof r.data !== 'string') return row;
  return { ...r, data: deserializeLegacyKvData(r.data) };
}

function decryptLegacyKvResult(result: unknown): unknown {
  if (result === null || result === undefined) return result;
  if (Array.isArray(result)) {
    return result.map((row) => decryptLegacyKvRow(row));
  }
  if (typeof result === 'object' && 'data' in (result as object)) {
    return decryptLegacyKvRow(result);
  }
  return result;
}

/** Prisma extension — تشفير/فك تلقائي لـ LegacyAppKvStore.data */
export const legacyKvCryptoExtension = Prisma.defineExtension({
  query: {
    legacyAppKvStore: {
      async $allOperations({ args, query }) {
        patchLegacyKvWriteArgs(args as Record<string, unknown>);
        const result = await query(args);
        return decryptLegacyKvResult(result);
      },
    },
  },
});
