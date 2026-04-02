/**
 * ترحيل شامل للأرقام المتسلسلة إلى صيغة BHD-YYYY-TYPE-SEQ
 *
 * تشمل: User, Property, Project, SerialNumberHistory, AccountingJournalEntry,
 *       AccountingDocument, AddressBookContact (JSON), BookingStorage (JSON)
 *
 * تشغيل:
 *   npx tsx scripts/migrate-serials-to-bhd.ts
 * تجربة بدون كتابة:
 *   MIGRATE_SERIALS_DRY_RUN=1 npx tsx scripts/migrate-serials-to-bhd.ts
 */

import { prisma } from '../lib/prisma';
import {
  buildSerialCounterKey,
  formatBhdSerial,
  isValidBhdSerial,
} from '../lib/server/serialNumbers';

const DRY = process.env.MIGRATE_SERIALS_DRY_RUN === '1' || process.env.MIGRATE_SERIALS_DRY_RUN === 'true';

const ROLE_SERIAL_CODE: Record<string, string> = {
  ADMIN: 'A',
  SUPER_ADMIN: 'A',
  CLIENT: 'C',
  OWNER: 'L',
  LANDLORD: 'L',
  COMPANY: 'P',
  ORG_MANAGER: 'M',
  ACCOUNTANT: 'N',
  PROPERTY_MANAGER: 'R',
  SALES_AGENT: 'S',
};

const PROPERTY_TYPE_CODE: Record<string, string> = {
  RENT: 'R',
  SALE: 'S',
  INVESTMENT: 'I',
};

const PROJECT_STATUS_CODE: Record<string, string> = {
  PLANNING: 'P',
  UNDER_DEVELOPMENT: 'D',
  UNDER_CONSTRUCTION: 'UC',
  COMPLETED: 'C',
};

const DOC_TYPE_TO_PREFIX: Record<string, string> = {
  INVOICE: 'INV',
  PURCHASE_INV: 'PINV',
  RECEIPT: 'RCP',
  QUOTE: 'QOT',
  DEPOSIT: 'DEP',
  PAYMENT: 'PAY',
  PURCHASE_ORDER: 'PO',
  JOURNAL: 'JRN',
  OTHER: 'DOC',
};

function parseBhdParts(serial: string): { year: number; typeCode: string; seq: number } | null {
  const parts = String(serial).trim().split('-');
  if (parts.length < 5 || parts[0].toUpperCase() !== 'BHD') return null;
  const year = parseInt(parts[1]!, 10);
  const seqStr = parts[parts.length - 1]!;
  const seq = parseInt(seqStr, 10);
  if (!Number.isFinite(year) || !Number.isFinite(seq)) return null;
  const typeCode = parts.slice(2, -1).join('-');
  if (!typeCode) return null;
  return { year, typeCode, seq };
}

function seedCounterFromBhdRows(
  rows: { serialNumber: string }[],
  counter: Map<string, number>
): void {
  for (const r of rows) {
    if (!isValidBhdSerial(r.serialNumber)) continue;
    const p = parseBhdParts(r.serialNumber);
    if (!p) continue;
    const key = buildSerialCounterKey(p.typeCode, p.year);
    counter.set(key, Math.max(counter.get(key) ?? 0, p.seq));
  }
}

function nextBhd(typeCode: string, year: number, counter: Map<string, number>): string {
  const key = buildSerialCounterKey(typeCode, year);
  const next = (counter.get(key) ?? 0) + 1;
  counter.set(key, next);
  return formatBhdSerial(typeCode, next, year);
}

/** PRP-R-2025-0001 */
function legacyPropertyToTypeCode(serial: string): string | null {
  const m = String(serial).match(/^PRP-([RSI])-(\d{4})-(\d+)$/i);
  if (!m) return null;
  return `PRP-${m[1]!.toUpperCase()}`;
}

/** PRJ-C-2025-0001 (C = status code letter) */
function legacyProjectToTypeCode(serial: string): string | null {
  const m = String(serial).match(/^PRJ-([A-Z0-9]+)-(\d{4})-(\d+)$/i);
  if (!m) return null;
  return `PRJ-${m[1]!.toUpperCase()}`;
}

/** JRN-2025-0001 */
function legacyJournalToTypeCode(): string {
  return 'ACC-JRN';
}

/** INV-2025-0001 أو JRN-2025-0001 داخل مستندات */
function legacyDocToTypeCode(serial: string, docType: string): string {
  if (isValidBhdSerial(serial)) {
    const p = parseBhdParts(serial);
    if (p) return p.typeCode;
  }
  const upper = serial.toUpperCase();
  const docPrefix = DOC_TYPE_TO_PREFIX[docType] || 'DOC';
  if (upper.startsWith('JRN-')) return 'ACC-JRN';
  const m = upper.match(/^([A-Z]+)-(\d{4})-(\d+)$/);
  if (m) return `ACC-${m[1]}`;
  return `ACC-${docPrefix}`;
}

async function syncCountersFromMap(counter: Map<string, number>): Promise<void> {
  for (const [key, lastValue] of counter) {
    if (DRY) {
      console.log(`[dry-run] SerialCounter ${key} = ${lastValue}`);
      continue;
    }
    await prisma.serialCounter.upsert({
      where: { key },
      create: { key, lastValue },
      update: { lastValue },
    });
  }
}

async function migrateUsers(counter: Map<string, number>): Promise<number> {
  const all = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
  seedCounterFromBhdRows(all, counter);
  let n = 0;
  for (const u of all) {
    if (isValidBhdSerial(u.serialNumber)) continue;
    const year = u.createdAt.getFullYear();
    const letter = ROLE_SERIAL_CODE[String(u.role || '').toUpperCase()] || 'C';
    const typeCode = `USR-${letter}`;
    let newSerial: string;
    const m = u.serialNumber.match(/^USR-([A-Z])-(\d{4})-(\d+)$/i);
    if (m) {
      const tc = `USR-${m[1]!.toUpperCase()}`;
      const y = parseInt(m[2]!, 10);
      const seq = parseInt(m[3]!, 10);
      const key = buildSerialCounterKey(tc, y);
      counter.set(key, Math.max(counter.get(key) ?? 0, seq));
      newSerial = formatBhdSerial(tc, seq, y);
    } else {
      newSerial = nextBhd(typeCode, year, counter);
    }
    if (DRY) console.log(`[dry-run] User ${u.id}: ${u.serialNumber} -> ${newSerial}`);
    else await prisma.user.update({ where: { id: u.id }, data: { serialNumber: newSerial } });
    n++;
  }
  return n;
}

async function migrateProperties(counter: Map<string, number>): Promise<number> {
  const all = await prisma.property.findMany({ orderBy: { createdAt: 'asc' } });
  seedCounterFromBhdRows(all, counter);
  let n = 0;
  for (const p of all) {
    if (isValidBhdSerial(p.serialNumber)) continue;
    const year = p.createdAt.getFullYear();
    const code = PROPERTY_TYPE_CODE[p.type] || 'X';
    const typeCode = `PRP-${code}`;
    let newSerial: string | null = null;
    const legacyTc = legacyPropertyToTypeCode(p.serialNumber);
    if (legacyTc) {
      const m = p.serialNumber.match(/^PRP-([RSI])-(\d{4})-(\d+)$/i);
      if (m) {
        const y = parseInt(m[2]!, 10);
        const seq = parseInt(m[3]!, 10);
        const key = buildSerialCounterKey(legacyTc, y);
        counter.set(key, Math.max(counter.get(key) ?? 0, seq));
        newSerial = formatBhdSerial(legacyTc, seq, y);
      }
    }
    if (!newSerial) newSerial = nextBhd(typeCode, year, counter);
    if (DRY) console.log(`[dry-run] Property ${p.id}: ${p.serialNumber} -> ${newSerial}`);
    else await prisma.property.update({ where: { id: p.id }, data: { serialNumber: newSerial } });
    n++;
  }
  return n;
}

async function migrateProjects(counter: Map<string, number>): Promise<number> {
  const all = await prisma.project.findMany({ orderBy: { createdAt: 'asc' } });
  seedCounterFromBhdRows(all, counter);
  let n = 0;
  for (const p of all) {
    if (isValidBhdSerial(p.serialNumber)) continue;
    const year = p.createdAt.getFullYear();
    const st = PROJECT_STATUS_CODE[p.status] || 'X';
    const typeCode = `PRJ-${st}`;
    let newSerial: string | null = null;
    if (legacyProjectToTypeCode(p.serialNumber)) {
      const m = p.serialNumber.match(/^PRJ-([A-Z0-9]+)-(\d{4})-(\d+)$/i);
      if (m) {
        const tc = `PRJ-${m[1]!.toUpperCase()}`;
        const y = parseInt(m[2]!, 10);
        const seq = parseInt(m[3]!, 10);
        const key = buildSerialCounterKey(tc, y);
        counter.set(key, Math.max(counter.get(key) ?? 0, seq));
        newSerial = formatBhdSerial(tc, seq, y);
      }
    }
    if (!newSerial) newSerial = nextBhd(typeCode, year, counter);
    if (DRY) console.log(`[dry-run] Project ${p.id}: ${p.serialNumber} -> ${newSerial}`);
    else await prisma.project.update({ where: { id: p.id }, data: { serialNumber: newSerial } });
    n++;
  }
  return n;
}

async function migrateSerialHistory(counter: Map<string, number>): Promise<number> {
  const rows = await prisma.serialNumberHistory.findMany({ orderBy: { changedAt: 'asc' } });
  let n = 0;
  for (const h of rows) {
    if (isValidBhdSerial(h.serialNumber)) continue;
    const year = h.changedAt.getFullYear();
    const newSerial = nextBhd('HIS', year, counter);
    if (DRY) console.log(`[dry-run] SerialHistory ${h.id}: ${h.serialNumber} -> ${newSerial}`);
    else
      await prisma.serialNumberHistory.update({
        where: { id: h.id },
        data: { serialNumber: newSerial },
      });
    n++;
  }
  return n;
}

async function migrateJournalEntries(counter: Map<string, number>): Promise<number> {
  const all = await prisma.accountingJournalEntry.findMany({ orderBy: { createdAt: 'asc' } });
  seedCounterFromBhdRows(all as { serialNumber: string }[], counter);
  let n = 0;
  for (const e of all) {
    if (isValidBhdSerial(e.serialNumber)) continue;
    const year = e.date.getFullYear();
    const typeCode = legacyJournalToTypeCode();
    let newSerial: string | null = null;
    const m = e.serialNumber.match(/^JRN-(\d{4})-(\d+)$/i);
    if (m) {
      const y = parseInt(m[1]!, 10);
      const seq = parseInt(m[2]!, 10);
      const key = buildSerialCounterKey(typeCode, y);
      counter.set(key, Math.max(counter.get(key) ?? 0, seq));
      newSerial = formatBhdSerial(typeCode, seq, y);
    } else {
      newSerial = nextBhd(typeCode, year, counter);
    }
    if (DRY) console.log(`[dry-run] JournalEntry ${e.id}: ${e.serialNumber} -> ${newSerial}`);
    else
      await prisma.accountingJournalEntry.update({
        where: { id: e.id },
        data: { serialNumber: newSerial },
      });
    n++;
  }
  return n;
}

async function migrateAccountingDocuments(counter: Map<string, number>): Promise<number> {
  const all = await prisma.accountingDocument.findMany({ orderBy: { createdAt: 'asc' } });
  seedCounterFromBhdRows(all, counter);
  let n = 0;
  for (const d of all) {
    if (isValidBhdSerial(d.serialNumber)) continue;
    const year = d.date.getFullYear();
    const typeCode = legacyDocToTypeCode(d.serialNumber, d.type);
    let newSerial: string | null = null;
    const legacy = d.serialNumber.match(/^([A-Z]+)-(\d{4})-(\d+)$/i);
    if (legacy) {
      const pfx = legacy[1]!;
      const y = parseInt(legacy[2]!, 10);
      const seq = parseInt(legacy[3]!, 10);
      const tc = pfx === 'JRN' ? 'ACC-JRN' : `ACC-${pfx}`;
      const key = buildSerialCounterKey(tc, y);
      counter.set(key, Math.max(counter.get(key) ?? 0, seq));
      newSerial = formatBhdSerial(tc, seq, y);
    } else {
      newSerial = nextBhd(typeCode, year, counter);
    }
    if (DRY) console.log(`[dry-run] AccountingDocument ${d.id}: ${d.serialNumber} -> ${newSerial}`);
    else
      await prisma.accountingDocument.update({
        where: { id: d.id },
        data: { serialNumber: newSerial },
      });
    n++;
  }
  return n;
}

async function migrateAddressBookContacts(counter: Map<string, number>): Promise<number> {
  const rows = await prisma.addressBookContact.findMany({ orderBy: { updatedAt: 'asc' } });
  let n = 0;
  for (const row of rows) {
    const data = row.data as Record<string, unknown>;
    const sn = data.serialNumber;
    if (typeof sn === 'string' && isValidBhdSerial(sn)) continue;
    const year = row.createdAt.getFullYear();
    const cat = String(data.category || 'OTHER').toUpperCase();
    const short = ADR_CATEGORY_CODE[cat] ?? 'O';
    const typeCode = `ADR-${short}`;
    let newSerial: string;
    if (typeof sn === 'string' && /^USR-/i.test(sn.trim())) {
      const m = sn.match(/^USR-([A-Z])-(\d{4})-(\d+)$/i);
      if (m) {
        const tc = `USR-${m[1]!.toUpperCase()}`;
        const y = parseInt(m[2]!, 10);
        const seq = parseInt(m[3]!, 10);
        const key = buildSerialCounterKey(tc, y);
        counter.set(key, Math.max(counter.get(key) ?? 0, seq));
        newSerial = formatBhdSerial(tc, seq, y);
      } else {
        newSerial = nextBhd(typeCode, year, counter);
      }
    } else {
      newSerial = nextBhd(typeCode, year, counter);
    }
    const nextData = { ...data, serialNumber: newSerial };
    if (DRY) console.log(`[dry-run] AddressBook ${row.contactId}: ${String(sn ?? '')} -> ${newSerial}`);
    else
      await prisma.addressBookContact.update({
        where: { id: row.id },
        data: { data: nextData as object },
      });
    n++;
  }
  return n;
}

async function migrateBookingStorage(counter: Map<string, number>): Promise<number> {
  const rows = await prisma.bookingStorage.findMany({ orderBy: { createdAt: 'asc' } });
  let n = 0;
  for (const row of rows) {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(row.data) as Record<string, unknown>;
    } catch {
      continue;
    }
    const year = row.createdAt.getFullYear();
    let changed = false;
    if (!parsed.bookingSerial || !isValidBhdSerial(String(parsed.bookingSerial))) {
      parsed.bookingSerial = nextBhd('BKG', year, counter);
      changed = true;
    }
    const cd = parsed.contractData as Record<string, unknown> | undefined;
    if (cd && typeof cd === 'object') {
      const existingCtr = cd.contractSerial;
      if (typeof existingCtr === 'string' && isValidBhdSerial(existingCtr)) {
        /* يبقى كما هو */
      } else {
        cd.contractSerial = nextBhd('CTR', year, counter);
        if (cd.serialNumber) delete cd.serialNumber;
        parsed.contractData = cd;
        changed = true;
      }
    }
    if (!changed) continue;
    if (DRY) console.log(`[dry-run] BookingStorage ${row.bookingId}: updated JSON`);
    else
      await prisma.bookingStorage.update({
        where: { bookingId: row.bookingId },
        data: { data: JSON.stringify(parsed), updatedAt: new Date() },
      });
    n++;
  }
  return n;
}

async function main(): Promise<void> {
  console.log(DRY ? '--- DRY RUN (no writes) ---' : '--- MIGRATE SERIALS TO BHD ---');
  console.log(
    'ملاحظة: جدول Subscription لا يحتوي حقل serialNumber في المخطط — يُستثنى من الترحيل حتى يُضاف حقل لاحقاً إن لزم.'
  );
  const counter = new Map<string, number>();

  const u = await migrateUsers(counter);
  const p = await migrateProperties(counter);
  const j = await migrateProjects(counter);
  const h = await migrateSerialHistory(counter);
  const je = await migrateJournalEntries(counter);
  const ad = await migrateAccountingDocuments(counter);
  const ab = await migrateAddressBookContacts(counter);
  const bk = await migrateBookingStorage(counter);

  await syncCountersFromMap(counter);

  console.log('Done:', {
    users: u,
    properties: p,
    projects: j,
    serialHistory: h,
    journalEntries: je,
    accountingDocuments: ad,
    addressBookContacts: ab,
    bookingStorageRows: bk,
    dryRun: DRY,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
