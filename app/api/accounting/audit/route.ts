import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType') || undefined;
    const entityId = searchParams.get('entityId') || undefined;
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const where: any = {};
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;

    const rows = await prisma.accountingAuditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: Math.min(limit, 500),
    });

    const logs = rows.map((r) => ({
      id: r.id,
      timestamp: r.timestamp.toISOString(),
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      userId: r.userId,
      reason: r.reason,
      previousState: r.previousState,
      newState: r.newState,
    }));

    return NextResponse.json(logs);
  } catch (err) {
    console.error('Accounting audit GET:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch audit log' },
      { status: 500 }
    );
  }
}
