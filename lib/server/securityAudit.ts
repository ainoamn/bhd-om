import { prisma } from '@/lib/prisma';
import type { SecurityEvent, SecurityEventType } from '@/lib/security';

const SEVERITY_MAP: Partial<Record<SecurityEventType, string>> = {
  LOGIN_FAILURE: 'WARNING',
  PERMISSION_DENIED: 'WARNING',
  SUSPICIOUS_ACTIVITY: 'CRITICAL',
};

/** تسجيل حدث أمني في جدول AuditLog (الخادم) */
export async function logSecurityEventServer(event: SecurityEvent): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: event.userId ?? null,
        action: event.type,
        entityType: 'Security',
        entityId: event.userId ?? '-',
        details: event.details ? JSON.stringify({ ip: event.ip, userAgent: event.userAgent, ...event.details }) : null,
        ipAddress: event.ip ?? null,
        userAgent: event.userAgent ?? null,
        severity: SEVERITY_MAP[event.type] ?? 'INFO',
      },
    });
  } catch (err) {
    console.error('[SECURITY_AUDIT_DB]', err);
  }
}
