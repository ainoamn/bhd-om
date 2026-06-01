import { NextRequest, NextResponse } from 'next/server';
import { getAccountsFromDb } from '@/lib/accounting/data/dbService';
import { suggestJournalEntryFromText } from '@/lib/accounting/ai/suggestEntryEngine';
import { getAccountingRoleFromRequest } from '@/lib/accounting/rbac/apiAuth';
import type { ChartAccount } from '@/lib/accounting/domain/types';

/** AI suggest journal entry — proposal only, user must approve before posting */
export async function POST(request: NextRequest) {
  const role = await getAccountingRoleFromRequest(request);
  if (role === undefined) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const description = String(body.description || '').trim();
    const amount = body.amount != null ? Number(body.amount) : undefined;
    if (!description) {
      return NextResponse.json({ error: 'Description required' }, { status: 400 });
    }
    const accounts = (await getAccountsFromDb()) as ChartAccount[];
    const result = suggestJournalEntryFromText(
      description,
      accounts,
      amount != null && Number.isFinite(amount) ? amount : undefined
    );
    if (!result) {
      return NextResponse.json(
        { error: 'Could not parse suggestion — include amount and type (receipt/expense)' },
        { status: 422 }
      );
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error('AI suggest-entry:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Suggest failed' },
      { status: 500 }
    );
  }
}
