import { NextRequest, NextResponse } from 'next/server';
import { getAccountsFromDb } from '@/lib/accounting/data/dbService';

export async function GET() {
  try {
    const accounts = await getAccountsFromDb();
    return NextResponse.json(accounts);
  } catch (err) {
    console.error('Accounting accounts GET:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}
