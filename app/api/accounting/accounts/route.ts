import { NextRequest, NextResponse } from 'next/server';
import { getAccountsFromDb } from '@/lib/accounting/data/dbService';
import { getAccountingRoleFromRequest } from '@/lib/accounting/rbac/apiAuth';
import { requirePermission } from '@/lib/accounting/rbac/apiAuth';
import { prisma } from '@/lib/prisma';

const READ_CACHE_HEADERS = {
  'Cache-Control': 'private, max-age=30, stale-while-revalidate=120',
  Vary: 'Cookie, Authorization',
};

export async function GET(request: NextRequest) {
  const role = await getAccountingRoleFromRequest(request);
  const allowed = role !== undefined;
  if (!allowed) {
    return NextResponse.json({ error: 'Unauthorized: login required' }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const limitRaw = Number(searchParams.get('limit') || '0');
    const offsetRaw = Number(searchParams.get('offset') || '0');
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(500, Math.floor(limitRaw)) : 0;
    const offset = Number.isFinite(offsetRaw) && offsetRaw > 0 ? Math.floor(offsetRaw) : 0;
    const accounts = await getAccountsFromDb();
    const totalCount = accounts.length;
    const paged = limit > 0 ? accounts.slice(offset, offset + limit) : accounts;
    return NextResponse.json(paged, {
      headers: {
        ...READ_CACHE_HEADERS,
        'X-Total-Count': String(totalCount),
        'X-Limit': String(limit || totalCount),
        'X-Offset': String(offset),
      },
    });
  } catch (err) {
    console.error('Accounting accounts GET:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const perm = await requirePermission(request, 'ACCOUNT_EDIT');
  if (!perm.ok) {
    return NextResponse.json({ error: perm.message }, { status: perm.status });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const id = typeof body.id === 'string' && body.id.trim() ? body.id.trim() : undefined;
    const code = String(body.code || '').trim();
    const nameAr = String(body.nameAr || '').trim();
    const type = String(body.type || '').trim() as 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
    if (!code || !nameAr || !type) {
      return NextResponse.json({ error: 'Missing required account fields' }, { status: 400 });
    }
    const payload = {
      code,
      nameAr,
      nameEn: String(body.nameEn || '').trim(),
      type,
      parentId: typeof body.parentId === 'string' && body.parentId.trim() ? body.parentId.trim() : undefined,
      isActive: body.isActive === undefined ? true : Boolean(body.isActive),
    };
    if (id) {
      await prisma.accountingAccount.update({ where: { id }, data: payload });
    } else {
      await prisma.accountingAccount.create({ data: payload });
    }
    const accounts = await getAccountsFromDb();
    return NextResponse.json(accounts);
  } catch (err) {
    console.error('Accounting accounts POST:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save account' },
      { status: 400 }
    );
  }
}
