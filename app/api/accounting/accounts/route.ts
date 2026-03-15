import { NextRequest, NextResponse } from 'next/server';
import { getAccountsFromDb } from '@/lib/accounting/data/dbService';
import { requirePermission } from '@/lib/accounting/rbac/apiAuth';

export async function GET(request: NextRequest) {
  const perm = await requirePermission(request, 'ACCOUNT_VIEW');
  if (!perm.ok) {
    return NextResponse.json({ error: perm.message }, { status: perm.status });
  }
  try {
    const accounts = await getAccountsFromDb();
    return NextResponse.json(accounts, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', Pragma: 'no-cache' },
    });
  } catch (err) {
    console.error('Accounting accounts GET:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}
