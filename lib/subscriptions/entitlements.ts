import { prisma } from '@/lib/prisma';

type LimitResource = 'users' | 'properties';

function parseLimits(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function readLimit(limits: Record<string, unknown>, resource: LimitResource): number | null {
  const keys = resource === 'users' ? ['maxUsers', 'users', 'usersLimit'] : ['maxProperties', 'properties', 'propertiesLimit'];
  for (const k of keys) {
    const v = Number(limits[k]);
    if (Number.isFinite(v)) return v;
  }
  return null;
}

export async function checkLimit(userId: string, resource: LimitResource): Promise<boolean> {
  const activeSub = await prisma.subscription.findFirst({
    where: { userId, status: 'active' },
    orderBy: { updatedAt: 'desc' },
    include: { plan: { select: { limitsJson: true } } },
  });
  if (!activeSub?.plan) return true; // no active plan => keep backward-compatible flow

  const limits = parseLimits(activeSub.plan.limitsJson);
  const limit = readLimit(limits, resource);
  if (limit == null || limit < 0) return true;

  if (resource === 'users') {
    const count = await prisma.user.count({ where: { organizationId: userId } });
    return count < limit;
  }

  const count = await prisma.property.count({
    where: {
      OR: [{ createdById: userId }, { ownerId: userId }],
      isArchived: false,
    },
  });
  return count < limit;
}
