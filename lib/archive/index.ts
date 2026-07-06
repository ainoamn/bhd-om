/**
 * نظام الأرشفة — BHD-OM
 * =====================
 * تم تجميع جميع وحدات الأرشفة في ملف واحد لتسهيل الصيانة
 *
 * الدوال المتاحة:
 * - archiveEntity(...)            أرشفة كيان
 * - restoreEntity(...)            استعادة كيان
 * - searchArchive(...)            البحث في الأرشيف
 * - getRestoreLogs(...)           سجلات الاستعادة
 * - runAutoArchive()              الأرشفة التلقائية
 * - canArchive(role) / canRestore(role)  التحقق من الصلاحيات
 */

import { prisma } from '@/lib/prisma';
import { createChecksum } from '@/lib/encryption';

// ──────────────────────────────────────────
// الأنواع
// ──────────────────────────────────────────
export type ArchiveEntityType = 'PROPERTY' | 'DOCUMENT' | 'ACCOUNT' | 'CONTRACT' | 'RESERVATION' | 'USER';
export type UserRole = 'ADMIN' | 'COMPANY' | 'CLIENT' | 'OWNER' | 'ORG_MANAGER';

// ──────────────────────────────────────────
// الصلاحيات
// ──────────────────────────────────────────
const ALLOWED_ROLES: UserRole[] = ['ADMIN', 'ORG_MANAGER'];

export function canArchive(role: UserRole): boolean { return ALLOWED_ROLES.includes(role); }
export function canRestore(role: UserRole): boolean { return ALLOWED_ROLES.includes(role); }

// ──────────────────────────────────────────
// أرشفة الكيانات
// ──────────────────────────────────────────

export interface ArchiveOptions {
  reason?: string;
  notes?: string;
  policyId?: string;
  isAutoArchive?: boolean;
}

export interface ArchiveResult {
  success: boolean;
  recordId?: string;
  message: string;
  error?: string;
  archivedAt?: Date;
}

/** أرشفة أي كيان (عقار، مستند، حساب، عقد، حجز، مستخدم) */
export async function archiveEntity(
  entityType: ArchiveEntityType,
  entityId: string,
  entityTitle: string,
  dataSnapshot: string,
  archivedById: string,
  userRole: UserRole,
  options: ArchiveOptions = {}
): Promise<ArchiveResult> {
  if (!canArchive(userRole)) {
    return { success: false, message: 'ليس لديك صلاحية الأرشفة', error: 'PERMISSION_DENIED' };
  }

  try {
    const checksum = createChecksum(dataSnapshot);
    const record = await prisma.archiveRecord.create({
      data: {
        entityType,
        entityId,
        entityTitle,
        action: options.isAutoArchive ? 'AUTO_ARCHIVE' : 'ARCHIVE',
        status: 'COMPLETED',
        reason: options.reason,
        notes: options.notes,
        dataSnapshot,
        checksum,
        archivedById,
        isAutoArchive: options.isAutoArchive || false,
        policyId: options.policyId,
      },
    });

    return { success: true, recordId: record.id, message: 'تمت الأرشفة بنجاح', archivedAt: record.createdAt };
  } catch (error) {
    return { success: false, message: 'فشل الأرشفة', error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/** البحث في الأرشيف */
export async function searchArchive(
  entityType?: ArchiveEntityType,
  query?: string,
  page: number = 1,
  pageSize: number = 20
) {
  const where: any = {};
  if (entityType) where.entityType = entityType;
  if (query) where.entityTitle = { contains: query, mode: 'insensitive' };

  const [records, total] = await Promise.all([
    prisma.archiveRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.archiveRecord.count({ where }),
  ]);

  return { records, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

// ──────────────────────────────────────────
// استعادة الأرشيف
// ──────────────────────────────────────────

export interface RestoreResult {
  success: boolean;
  logId?: string;
  message: string;
  error?: string;
  restoredAt?: Date;
}

/** استعادة كيان من الأرشيف */
export async function restoreEntity(
  archiveId: string,
  restoredById: string,
  userRole: UserRole
): Promise<RestoreResult> {
  if (!canRestore(userRole)) {
    return { success: false, message: 'ليس لديك صلاحية الاستعادة', error: 'PERMISSION_DENIED' };
  }

  try {
    const archive = await prisma.archiveRecord.findUnique({ where: { id: archiveId } });
    if (!archive) return { success: false, message: 'الأرشيف غير موجود', error: 'NOT_FOUND' };

    const log = await prisma.archiveRestoreLog.create({
      data: {
        archiveId,
        entityType: archive.entityType as ArchiveEntityType,
        entityId: archive.entityId,
        entityTitle: archive.entityTitle,
        restoredById,
        success: true,
        dataSnapshot: archive.dataSnapshot,
      },
    });

    return { success: true, logId: log.id, message: 'تمت الاستعادة بنجاح', restoredAt: log.restoredAt };
  } catch (error) {
    return { success: false, message: 'فشل الاستعادة', error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/** سجلات الاستعادة */
export async function getRestoreLogs(archiveId?: string, page: number = 1, pageSize: number = 20) {
  const where: any = {};
  if (archiveId) where.archiveId = archiveId;

  const [records, total] = await Promise.all([
    prisma.archiveRestoreLog.findMany({
      where,
      orderBy: { restoredAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.archiveRestoreLog.count({ where }),
  ]);

  return { records, total, page, pageSize };
}

// ──────────────────────────────────────────
// الأرشفة التلقائية
// ──────────────────────────────────────────

/** تشغيل الأرشفة التلقائية بناءً على السياسات */
export async function runAutoArchive(): Promise<{ archived: number; errors: string[] }> {
  const errors: string[] = [];
  let archived = 0;

  const policies = await prisma.archivePolicy.findMany({ where: { isActive: true } });

  for (const policy of policies) {
    try {
      if (policy.entityType === 'PROPERTY' && policy.condition === 'INACTIVE_DAYS' && policy.conditionValue) {
        const cutoff = new Date(Date.now() - policy.conditionValue * 24 * 60 * 60 * 1000);
        const inactiveProps = await prisma.property.findMany({
          where: { status: 'FROZEN', updatedAt: { lt: cutoff } },
          take: 100,
        });

        for (const prop of inactiveProps) {
          const result = await archiveEntity(
            'PROPERTY', prop.id, prop.titleAr || prop.id,
            JSON.stringify(prop), 'system', 'ADMIN',
            { reason: 'أرشفة تلقائية - عقار مجمد', policyId: policy.id, isAutoArchive: true }
          );
          if (result.success) archived++;
          else errors.push(`Property ${prop.id}: ${result.error}`);
        }
      }
    } catch (error) {
      errors.push(`Policy ${policy.id}: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  return { archived, errors };
}
