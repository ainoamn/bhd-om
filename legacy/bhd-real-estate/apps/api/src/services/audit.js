import { prisma, withCompanyContext } from '../lib/prisma.js';

export async function writeAudit({ companyId, userId, action, entityType, entityId, meta }) {
  await withCompanyContext(companyId, (tx) =>
    tx.auditLog.create({
      data: {
        companyId,
        userId: userId || null,
        action,
        entityType: entityType || null,
        entityId: entityId || null,
        meta: meta || undefined,
      },
    })
  );
}
