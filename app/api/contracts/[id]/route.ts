import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/guard';

function safeParse(data: string): Record<string, unknown> | null {
  try {
    return JSON.parse(data) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function extractContract(parsed: Record<string, unknown>, id: string) {
  const cid = String(parsed.contractId || parsed.id || '');
  const cd = ((parsed.contractData as Record<string, unknown> | undefined) || {}) as Record<string, unknown>;
  const cdid = String(cd.id || '');
  if (cid !== id && cdid !== id) return null;
  return {
    ...cd,
    id,
    bookingId: String(parsed.id || cd.bookingId || ''),
    status: String(parsed.contractStage || cd.status || 'DRAFT'),
    createdAt: String(cd.createdAt || parsed.createdAt || new Date().toISOString()),
    updatedAt: String(cd.updatedAt || parsed.updatedAt || new Date().toISOString()),
  };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;
    const rows = await prisma.bookingStorage.findMany({ orderBy: { updatedAt: 'desc' } });
    for (const r of rows) {
      const parsed = safeParse(r.data);
      if (!parsed) continue;
      const contract = extractContract(parsed, id);
      if (contract) return NextResponse.json(contract);
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (e) {
    console.error('GET /api/contracts/[id]', e);
    return NextResponse.json({ error: 'Failed to fetch contract' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;
    const patch = (await req.json()) as Record<string, unknown>;

    const rows = await prisma.bookingStorage.findMany({ orderBy: { updatedAt: 'desc' } });
    for (const r of rows) {
      const parsed = safeParse(r.data);
      if (!parsed) continue;
      const contract = extractContract(parsed, id);
      if (!contract) continue;

      const now = new Date().toISOString();
      const nextContract = { ...contract, ...patch, id, bookingId: contract.bookingId, updatedAt: now };
      const nextBooking = {
        ...parsed,
        contractId: id,
        contractStage: String(nextContract.status || parsed.contractStage || 'DRAFT'),
        contractData: nextContract,
        updatedAt: now,
      };

      await prisma.bookingStorage.update({
        where: { bookingId: String(parsed.id || r.bookingId) },
        data: { data: JSON.stringify(nextBooking), updatedAt: new Date() },
      });
      return NextResponse.json(nextContract);
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (e) {
    console.error('PATCH /api/contracts/[id]', e);
    return NextResponse.json({ error: 'Failed to update contract' }, { status: 500 });
  }
}
