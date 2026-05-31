import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { assertAccountantConfirmedForContract, parseBookingStorageRow } from '@/lib/server/bookingContractGate';
import {
  contractFromBookingJson,
  getContractStorageById,
  parseContractStorageData,
  upsertContractStorageRow,
} from '@/lib/server/repositories/contractStorageRepo';
import { syncContractIntoBookingStorage } from '@/lib/server/syncContractBookingStorage';
import { prisma } from '@/lib/prisma';

function extractContractFromBooking(parsed: Record<string, unknown>, id: string) {
  const contract = contractFromBookingJson(parsed);
  if (!contract) return null;
  const cid = String(contract.id || '');
  if (cid !== id) return null;
  return contract;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;

    const row = await getContractStorageById(id);
    if (row) {
      const contract = parseContractStorageData(row);
      if (contract) return NextResponse.json(contract);
    }

    const rows = await prisma.bookingStorage.findMany({ orderBy: { updatedAt: 'desc' } });
    for (const r of rows) {
      const parsed = parseBookingStorageRow(r.data);
      if (!parsed) continue;
      const contract = extractContractFromBooking(parsed, id);
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

    const stored = await getContractStorageById(id);
    if (stored) {
      const current = parseContractStorageData(stored);
      if (!current) {
        return NextResponse.json({ error: 'Corrupt contract data' }, { status: 500 });
      }
      const bookingId = String(current.bookingId || stored.bookingId || '').trim();
      const prevStage = String(current.status || 'DRAFT');
      const nextStatus = String(patch.status || prevStage || 'DRAFT');
      const advancingFromDraft = prevStage === 'DRAFT' && nextStatus !== 'DRAFT';
      if (advancingFromDraft) {
        const bookingRow = bookingId
          ? await prisma.bookingStorage.findUnique({ where: { bookingId } })
          : null;
        const parsedBooking = bookingRow ? parseBookingStorageRow(bookingRow.data) : null;
        const gate = assertAccountantConfirmedForContract(parsedBooking || {});
        if (!gate.ok) {
          return NextResponse.json(
            { error: gate.error, message: 'Accountant must confirm payment before contract operations.' },
            { status: 403 }
          );
        }
      }

      const now = new Date().toISOString();
      const nextContract = { ...current, ...patch, id, bookingId, updatedAt: now };
      await upsertContractStorageRow({
        contractId: id,
        bookingId,
        payload: nextContract as Record<string, unknown>,
      });
      if (bookingId) {
        await syncContractIntoBookingStorage(
          bookingId,
          id,
          nextContract as Record<string, unknown>,
          String(nextContract.status || nextStatus)
        );
      }
      return NextResponse.json(nextContract);
    }

    const rows = await prisma.bookingStorage.findMany({ orderBy: { updatedAt: 'desc' } });
    for (const r of rows) {
      const parsed = parseBookingStorageRow(r.data);
      if (!parsed) continue;
      const contract = extractContractFromBooking(parsed, id);
      if (!contract) continue;

      const isNewContract = !parsed.contractId && !parsed.contractData;
      const nextStatus = String(patch.status || contract.status || parsed.contractStage || 'DRAFT');
      const prevStage = String(parsed.contractStage || contract.status || '');
      const advancingFromDraft = prevStage === 'DRAFT' && nextStatus !== 'DRAFT';
      if (isNewContract || advancingFromDraft || !parsed.contractId) {
        const gate = assertAccountantConfirmedForContract(parsed);
        if (!gate.ok) {
          return NextResponse.json(
            { error: gate.error, message: 'Accountant must confirm payment before contract operations.' },
            { status: 403 }
          );
        }
      }

      const now = new Date().toISOString();
      const bookingId = String(parsed.id || r.bookingId || contract.bookingId || '').trim();
      const nextContract = { ...contract, ...patch, id, bookingId, updatedAt: now };
      await upsertContractStorageRow({
        contractId: id,
        bookingId,
        payload: nextContract as Record<string, unknown>,
      });
      await syncContractIntoBookingStorage(
        bookingId,
        id,
        nextContract as Record<string, unknown>,
        String(nextContract.status || nextStatus)
      );
      return NextResponse.json(nextContract);
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (e) {
    console.error('PATCH /api/contracts/[id]', e);
    return NextResponse.json({ error: 'Failed to update contract' }, { status: 500 });
  }
}
