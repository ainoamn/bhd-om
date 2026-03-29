/**
 * منع تعدد جهات دفتر العناوين لنفس المستخدم (userId) — سبب اختلاف «حسابي» عن قائمة الإدارة
 */

import { prisma } from '@/lib/prisma';

export type AddressBookRowMinimal = {
  contactId: string;
  linkedUserId: string | null;
  data: unknown;
  updatedAt: Date;
};

function revisionMs(row: AddressBookRowMinimal): number {
  const d = (row.data as Record<string, unknown>) || {};
  const t = String(d.updatedAt ?? d.createdAt ?? row.updatedAt.toISOString());
  const ms = new Date(t).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

/**
 * معرفات الصفوف المكررة لنفس `data.userId` — يُبقى فائزاً واحداً:
 * 1) الصف الذي linkedUserId === userId (المرتبط رسمياً بحساب المستخدم)
 * 2) وإلا الأحدث حسب updatedAt في JSON ثم صف Prisma
 */
export function getDuplicateDropContactIds(rows: AddressBookRowMinimal[]): Set<string> {
  const drop = new Set<string>();
  const byUid = new Map<string, AddressBookRowMinimal[]>();
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
      const aL = a.linkedUserId === uid ? 1 : 0;
      const bL = b.linkedUserId === uid ? 1 : 0;
      if (bL !== aL) return bL - aL;
      return revisionMs(b) - revisionMs(a);
    });
    for (let i = 1; i < sorted.length; i++) {
      drop.add(sorted[i]!.contactId);
    }
  }
  return drop;
}

/** حذف كل صفوف دفتر العناوين الأخرى المرتبطة بنفس المستخدم (نفس userId في JSON أو linkedUserId) */
export async function deleteOtherAddressBookRowsForUser(keepContactId: string, userId: string): Promise<void> {
  await prisma.$executeRaw`
    DELETE FROM "AddressBookContact"
    WHERE "contactId" <> ${keepContactId}
    AND (
      "linkedUserId" = ${userId}
      OR (data->>'userId') = ${userId}
    )
  `;
}
