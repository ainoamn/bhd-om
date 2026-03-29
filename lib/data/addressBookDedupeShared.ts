/**
 * منطق موحّد: إزالة تكرار جهات دفتر العناوين (خادم + متصفح)
 * — userId: نفس المستخدم
 * — هاتف مُطبَّع: جهة شخصية بنفس الرقم (S2 بدون userId تُدمج مع S1)
 * — رقم مدني: جهة شخصية بنفس الرقم (≥4 أرقام)
 */

export type AddressBookDedupeRow = {
  contactId: string;
  linkedUserId: string | null;
  data: unknown;
  updatedAt: Date;
};

function revisionMs(row: AddressBookDedupeRow): number {
  const d = (row.data as Record<string, unknown>) || {};
  const t = String(d.updatedAt ?? d.createdAt ?? row.updatedAt.toISOString());
  const ms = new Date(t).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

export function normPhoneForDedupe(p: unknown): string {
  let d = String(p ?? '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 8 && d.startsWith('9')) d = '968' + d;
  if (d.length >= 8 && !d.startsWith('968')) d = '968' + d.replace(/^0+/, '');
  return d;
}

function normCivilForDedupe(c: unknown): string {
  return String(c ?? '').replace(/\D/g, '').trim();
}

function hasLinkedUserIdMatch(row: AddressBookDedupeRow, uid: string): number {
  return row.linkedUserId === uid ? 1 : 0;
}

function hasJsonUserId(row: AddressBookDedupeRow): number {
  const uid = (row.data as Record<string, unknown>)?.userId;
  return typeof uid === 'string' && uid.trim().length > 0 ? 1 : 0;
}

function isPersonalData(data: Record<string, unknown>): boolean {
  return data.contactType !== 'COMPANY' && data.companyData == null;
}

function addUserIdDrops(rows: AddressBookDedupeRow[], drop: Set<string>): void {
  const byUid = new Map<string, AddressBookDedupeRow[]>();
  for (const r of rows) {
    const uidRaw = (r.data as Record<string, unknown>)?.userId;
    const uid = typeof uidRaw === 'string' ? uidRaw.trim() : '';
    if (!uid) continue;
    const arr = byUid.get(uid);
    if (arr) arr.push(r);
    else byUid.set(uid, [r]);
  }
  for (const [uid, arr] of byUid) {
    if (arr.length <= 1) continue;
    const sorted = [...arr].sort((a, b) => {
      const aL = hasLinkedUserIdMatch(a, uid);
      const bL = hasLinkedUserIdMatch(b, uid);
      if (bL !== aL) return bL - aL;
      return revisionMs(b) - revisionMs(a);
    });
    for (let i = 1; i < sorted.length; i++) drop.add(sorted[i]!.contactId);
  }
}

function sortDuplicateGroup(a: AddressBookDedupeRow, b: AddressBookDedupeRow): number {
  const bu = hasJsonUserId(b) - hasJsonUserId(a);
  if (bu !== 0) return bu;
  const bl = (b.linkedUserId ? 1 : 0) - (a.linkedUserId ? 1 : 0);
  if (bl !== 0) return bl;
  return revisionMs(b) - revisionMs(a);
}

function addPhoneDrops(rows: AddressBookDedupeRow[], drop: Set<string>): void {
  const active = rows.filter((r) => !drop.has(r.contactId));
  const byPhone = new Map<string, AddressBookDedupeRow[]>();
  for (const r of active) {
    const c = (r.data as Record<string, unknown>) || {};
    if (!isPersonalData(c)) continue;
    const ph = normPhoneForDedupe(c.phone);
    if (ph.length < 8) continue;
    const arr = byPhone.get(ph);
    if (arr) arr.push(r);
    else byPhone.set(ph, [r]);
  }
  for (const arr of byPhone.values()) {
    if (arr.length <= 1) continue;
    const sorted = [...arr].sort(sortDuplicateGroup);
    for (let i = 1; i < sorted.length; i++) drop.add(sorted[i]!.contactId);
  }
}

function addCivilDrops(rows: AddressBookDedupeRow[], drop: Set<string>): void {
  const active = rows.filter((r) => !drop.has(r.contactId));
  const byC = new Map<string, AddressBookDedupeRow[]>();
  for (const r of active) {
    const c = (r.data as Record<string, unknown>) || {};
    if (!isPersonalData(c)) continue;
    const civ = normCivilForDedupe(c.civilId);
    if (civ.length < 4) continue;
    const arr = byC.get(civ);
    if (arr) arr.push(r);
    else byC.set(civ, [r]);
  }
  for (const arr of byC.values()) {
    if (arr.length <= 1) continue;
    const sorted = [...arr].sort(sortDuplicateGroup);
    for (let i = 1; i < sorted.length; i++) drop.add(sorted[i]!.contactId);
  }
}

/** معرفات جهات تُستبعد بعد الدمج — يُفضَّل صف بحساب مستخدم ثم مرتبط بـ linkedUserId ثم الأحدث */
export function getDuplicateDropContactIds(rows: AddressBookDedupeRow[]): Set<string> {
  const drop = new Set<string>();
  addUserIdDrops(rows, drop);
  addPhoneDrops(rows, drop);
  addCivilDrops(rows, drop);
  return drop;
}

export function dedupeContactsList<T extends { id: string; updatedAt?: string; createdAt?: string; linkedUserId?: string | null }>(
  contacts: T[]
): T[] {
  if (contacts.length <= 1) return contacts;
  const rows: AddressBookDedupeRow[] = contacts.map((c) => ({
    contactId: c.id,
    linkedUserId: typeof c.linkedUserId === 'string' && c.linkedUserId ? c.linkedUserId : null,
    data: c,
    updatedAt: new Date((c.updatedAt || c.createdAt || '').trim() || Date.now()),
  }));
  const drop = getDuplicateDropContactIds(rows);
  return contacts.filter((c) => !drop.has(c.id));
}
