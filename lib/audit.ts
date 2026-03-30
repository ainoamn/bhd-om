import { prisma } from '@/lib/prisma';

export interface AuditPayload {
  userId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  details?: Record<string, unknown> | null;
  reason?: string | null;
}

export async function logAudit(payload: AuditPayload): Promise<void> {
  try {
    await prisma.accountingAuditLog.create({
      data: {
        userId: payload.userId || null,
        action: payload.action,
        entityType: payload.targetType,
        entityId: payload.targetId || '-',
        reason: payload.reason || null,
        newState: payload.details ? JSON.stringify(payload.details) : null,
      },
    });
  } catch (err) {
    console.error('audit log failed:', err);
  }
}
