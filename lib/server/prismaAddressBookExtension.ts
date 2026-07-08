import { Prisma } from '@prisma/client';
import {
  decryptAddressBookRow,
  isEncryptedAddressBookData,
  parseAddressBookContactData,
  serializeAddressBookContactData,
} from '@/lib/server/addressBookCrypto';

type JsonRecord = Record<string, unknown>;

function encryptJsonValue(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  if (isEncryptedAddressBookData(value as Prisma.JsonValue)) return value;
  return serializeAddressBookContactData(value as JsonRecord);
}

function patchWriteArgs(args: Record<string, unknown>): void {
  if (args.data !== undefined && typeof args.data === 'object' && !Array.isArray(args.data)) {
    const d = args.data as JsonRecord;
    if ('data' in d && d.data !== undefined) {
      d.data = encryptJsonValue(d.data);
    }
  }
  for (const key of ['create', 'update'] as const) {
    const block = args[key];
    if (block && typeof block === 'object' && !Array.isArray(block)) {
      const b = block as JsonRecord;
      if (b.data !== undefined) {
        b.data = encryptJsonValue(b.data);
      }
    }
  }
  if (Array.isArray(args.data)) {
    args.data = (args.data as JsonRecord[]).map((row) => {
      if (row.data !== undefined) {
        return { ...row, data: encryptJsonValue(row.data) };
      }
      return row;
    });
  }
}

function decryptQueryResult(result: unknown): unknown {
  if (result === null || result === undefined) return result;
  if (Array.isArray(result)) {
    return result.map((row) =>
      row && typeof row === 'object' && 'data' in (row as object)
        ? decryptAddressBookRow(row as { data: Prisma.JsonValue })
        : row
    );
  }
  if (typeof result === 'object' && 'data' in (result as object)) {
    return decryptAddressBookRow(result as { data: Prisma.JsonValue });
  }
  return result;
}

/** Prisma extension — تشفير/فك تلقائي لـ AddressBookContact.data */
export const addressBookCryptoExtension = Prisma.defineExtension({
  query: {
    addressBookContact: {
      async $allOperations({ args, query }) {
        patchWriteArgs(args as Record<string, unknown>);
        const result = await query(args);
        return decryptQueryResult(result);
      },
    },
  },
});

/** لمسارات raw SQL التي تتجاوز Prisma extension */
export function serializeAddressBookForRawSql(payload: Record<string, unknown>): string {
  const stored = serializeAddressBookContactData(payload);
  return JSON.stringify(stored);
}

/** فك JSON مخزّن من raw SQL */
export function parseAddressBookFromRawSql(json: Prisma.JsonValue): Record<string, unknown> {
  return parseAddressBookContactData(json);
}
