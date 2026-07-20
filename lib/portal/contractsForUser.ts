import { prisma } from '@/lib/prisma';

/** تطبيع البريد لمطابقة emailNorm في العقود/الحجوزات */
export function normalizePortalEmail(email: string | null | undefined): string {
  return String(email || '')
    .trim()
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, '');
}

/**
 * عقود المستأجر — عبر emailNorm أو جهة دفتر العناوين المرتبطة بالمستخدم.
 * ContractStorage لا يحتوي linkedUserId في المخطط الحالي.
 */
export async function findContractsForTenantUser(userId: string, take = 50) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });
  if (!user) return [];

  const emailNorm = normalizePortalEmail(user.email);
  const contact = await prisma.addressBookContact.findFirst({
    where: { linkedUserId: userId },
    select: { contactId: true, data: true },
  });

  const or: Array<{ emailNorm?: string; bookingId?: string }> = [];
  if (emailNorm) or.push({ emailNorm });

  if (or.length === 0 && !contact) {
    return prisma.contractStorage.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 0,
    });
  }

  if (emailNorm) {
    return prisma.contractStorage.findMany({
      where: { emailNorm },
      orderBy: { updatedAt: 'desc' },
      take,
    });
  }

  return [];
}

/** عقود مرتبطة بعقارات المالك (propertyId الرقمي القديم إن وُجد في JSON) */
export async function findContractsForOwnerProperties(
  propertyIds: string[],
  take = 100
) {
  if (!propertyIds.length) return [];
  /** ContractStorage.propertyId من نوع Int — نحاول المطابقة عبر emailNorm للمالك لاحقاً إن لزم */
  const numericIds = propertyIds
    .map((id) => {
      const n = Number(id);
      return Number.isFinite(n) && String(n) === id ? n : null;
    })
    .filter((n): n is number => n != null);

  if (numericIds.length) {
    return prisma.contractStorage.findMany({
      where: { propertyId: { in: numericIds } },
      orderBy: { updatedAt: 'desc' },
      take,
    });
  }

  return prisma.contractStorage.findMany({
    orderBy: { updatedAt: 'desc' },
    take: Math.min(take, 20),
  });
}
