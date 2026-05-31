import { prisma } from '@/lib/prisma';
import { parseContactsCsv } from '@/lib/addressBook/parseContactsCsv';
import type { Contact } from '@/lib/data/addressBook';
import { assertAddressBookIdentityUnique } from '@/lib/server/addressBookIdentity';
import { withAddressBookSchemaHeal } from '@/lib/server/addressBookDbCompat';
import { normalizePublicPhone } from '@/lib/server/publicContractAccess';

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

type DupIndex = {
  phones: Set<string>;
  civils: Set<string>;
  passports: Set<string>;
};

async function loadDupIndex(): Promise<DupIndex> {
  const rows = await prisma.addressBookContact.findMany({
    select: { data: true },
  });
  const phones = new Set<string>();
  const civils = new Set<string>();
  const passports = new Set<string>();
  for (const row of rows) {
    const d = (row.data as Record<string, unknown>) || {};
    const p = normalizePublicPhone(String(d.phone || ''));
    if (p.length >= 6) phones.add(p);
    const civil = normCivil(d.civilId);
    if (civil.length >= 4) civils.add(civil);
    const pass = normPass(d.passportNumber);
    if (pass.length >= 4) passports.add(pass);
  }
  return { phones, civils, passports };
}

function isDupInIndex(index: DupIndex, c: Contact): boolean {
  const p = normalizePublicPhone(c.phone || '');
  if (p.length >= 6 && index.phones.has(p)) return true;
  const civil = normCivil(c.civilId);
  if (civil.length >= 4 && index.civils.has(civil)) return true;
  const pass = normPass(c.passportNumber);
  if (pass.length >= 4 && index.passports.has(pass)) return true;
  return false;
}

function trackInIndex(index: DupIndex, c: Contact) {
  const p = normalizePublicPhone(c.phone || '');
  if (p.length >= 6) index.phones.add(p);
  const civil = normCivil(c.civilId);
  if (civil.length >= 4) index.civils.add(civil);
  const pass = normPass(c.passportNumber);
  if (pass.length >= 4) index.passports.add(pass);
}

function newContactId(): string {
  return `CNT-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** استيراد CSV إلى AddressBookContact — server-first */
export async function importAddressBookCsvServer(csvText: string) {
  const parsed = parseContactsCsv(csvText);
  if (parsed.length === 0) {
    return { imported: 0, skipped: 0, total: 0 };
  }

  const index = await loadDupIndex();
  let imported = 0;
  let skipped = 0;

  for (const row of parsed) {
    if (isDupInIndex(index, row)) {
      skipped += 1;
      continue;
    }

    const contactId = newContactId();
    const contact: Contact = {
      ...row,
      id: contactId,
      updatedAt: new Date().toISOString(),
    };

    const ident = await assertAddressBookIdentityUnique(contact as unknown as Record<string, unknown>, contactId);
    if (!ident.ok) {
      skipped += 1;
      continue;
    }

    await withAddressBookSchemaHeal(prisma, async () => {
      await prisma.addressBookContact.upsert({
        where: { contactId },
        create: {
          contactId,
          linkedUserId: null,
          data: contact as object,
        },
        update: {
          data: contact as object,
          updatedAt: new Date(),
        },
      });
    });

    trackInIndex(index, contact);
    imported += 1;
  }

  return { imported, skipped, total: parsed.length };
}
