/**
 * التحقق من عدم تكرار الرقم المدني / الجواز / الرقم المتسلسل عبر دفتر العناوين على الخادم
 */

import { prisma } from '@/lib/prisma';

function normCivil(s: unknown): string {
  return String(s ?? '')
    .replace(/\D/g, '')
    .trim();
}

function normPass(s: unknown): string {
  return String(s ?? '')
    .trim()
    .toUpperCase();
}

function normSerial(s: unknown): string {
  return String(s ?? '').trim();
}

export type IdentityConflictCode = 'DUPLICATE_CIVIL_ID' | 'DUPLICATE_PASSPORT' | 'DUPLICATE_SERIAL';

export type IdentityCheckResult =
  | { ok: true }
  | { ok: false; code: IdentityConflictCode; message: string };

/** فحص التكرار مقابل كل صفوف دفتر العناوين ما عدا contactId المستثنى */
export async function assertAddressBookIdentityUnique(
  data: Record<string, unknown>,
  excludeContactId: string
): Promise<IdentityCheckResult> {
  const civil = normCivil(data.civilId);
  const pass = normPass(data.passportNumber);
  const serial = normSerial(data.serialNumber);

  const rows = await prisma.addressBookContact.findMany({
    select: { contactId: true, data: true },
  });

  for (const row of rows) {
    if (row.contactId === excludeContactId) continue;
    const d = (row.data as Record<string, unknown>) || {};
    if (civil.length >= 4 && normCivil(d.civilId) === civil) {
      return { ok: false, code: 'DUPLICATE_CIVIL_ID', message: 'Civil ID already registered' };
    }
    if (pass.length >= 4 && normPass(d.passportNumber) === pass) {
      return { ok: false, code: 'DUPLICATE_PASSPORT', message: 'Passport number already registered' };
    }
    if (serial.length >= 4 && normSerial(d.serialNumber) === serial) {
      return { ok: false, code: 'DUPLICATE_SERIAL', message: 'Serial number already in address book' };
    }
  }

  return { ok: true };
}
