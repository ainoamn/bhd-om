import { NextRequest, NextResponse } from 'next/server';
import { getFiscalPeriodsFromDb, lockPeriodInDb } from '@/lib/accounting/data/dbService';

export async function GET() {
  try {
    const periods = await getFiscalPeriodsFromDb();
    return NextResponse.json(periods);
  } catch (err) {
    console.error('Accounting periods GET:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch periods' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { periodId, userId } = body;
    if (!periodId) {
      return NextResponse.json({ error: 'periodId required' }, { status: 400 });
    }
    const result = await lockPeriodInDb(periodId, userId);
    if (!result) {
      return NextResponse.json({ error: 'Period not found' }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error('Accounting periods POST:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to lock period' },
      { status: 400 }
    );
  }
}
