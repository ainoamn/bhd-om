/**
 * تغيير الباقة مع الدفع: ترقية فورية أو تنزيل مجدول عند نهاية الفترة.
 * يسجّل إيصالاً في المحاسبة عند وجود مبلغ، ثم يطبّق الترقية أو يجدول التنزيل.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  ensureAccountingAccounts,
  getAccountsFromDb,
  createDocumentInDb,
  createJournalEntryInDb,
} from '@/lib/accounting/data/dbService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PaymentPayload = {
  cardLast4?: string;
  cardExpiry?: string;
  cardholderName?: string;
  amount: number;
  currency?: string;
};

async function createSubscriptionReceipt(params: {
  userId: string;
  userEmail?: string;
  planNameAr: string;
  planNameEn: string;
  amount: number;
  currency: string;
  direction: 'upgrade' | 'downgrade';
}): Promise<{ doc: { id: string }; docId: string } | null> {
  const { amount, planNameAr, planNameEn, direction } = params;
  if (amount <= 0) return null;
  await ensureAccountingAccounts();
  const accounts = await getAccountsFromDb();
  const cashAcc = accounts.find((a: { code: string }) => a.code === '1000');
  const revenueAcc = accounts.find((a: { code: string }) => a.code === '4200') || accounts.find((a: { code: string }) => a.code === '4000');
  if (!cashAcc || !revenueAcc) return null;
  const date = new Date().toISOString().slice(0, 10);
  const descAr = `دفع اشتراك - ${direction === 'upgrade' ? 'ترقية' : 'تنزيل'} - ${planNameAr}`;
  const descEn = `Subscription payment - ${direction} - ${planNameEn}`;
  const doc = await createDocumentInDb({
    type: 'RECEIPT',
    status: 'APPROVED',
    date,
    amount,
    currency: params.currency || 'OMR',
    totalAmount: amount,
    descriptionAr: descAr,
    descriptionEn: descEn,
  });
  const lines = [
    { accountId: cashAcc.id, debit: amount, credit: 0, descriptionAr: descAr, descriptionEn: descEn },
    { accountId: revenueAcc.id, debit: 0, credit: amount, descriptionAr: descAr, descriptionEn: descEn },
  ];
  await createJournalEntryInDb({
    date,
    lines,
    descriptionAr: descAr,
    descriptionEn: descEn,
    documentType: 'RECEIPT',
    documentId: doc.id,
    status: 'APPROVED',
    createdBy: 'subscription-payment',
  });
  return { doc, docId: doc.id };
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV === 'development' ? 'bhd-dev-secret-not-for-production' : undefined),
    });
    if (!token?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = token.sub as string;
    const body = await req.json().catch(() => ({}));
    const {
      requestedPlanId,
      direction,
      payment,
    } = body as {
      requestedPlanId: string;
      direction: 'upgrade' | 'downgrade';
      payment?: PaymentPayload;
    };
    if (!requestedPlanId || !direction || !['upgrade', 'downgrade'].includes(direction)) {
      return NextResponse.json({ error: 'requestedPlanId and direction (upgrade|downgrade) required' }, { status: 400 });
    }

    const planTable = await prisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND LOWER(table_name) = 'plan' LIMIT 1
    `;
    const planTableName = planTable?.[0]?.table_name;
    if (!planTableName) {
      return NextResponse.json({ error: 'Plan table not available' }, { status: 500 });
    }
    const planCols = await prisma.$queryRaw<{ column_name: string }[]>(
      Prisma.sql`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ${planTableName} ORDER BY ordinal_position`
    );
    const planColSet = new Set((planCols || []).map((c) => c.column_name));
    const pick = (a: string, b: string) => (planColSet.has(a) ? a : planColSet.has(b) ? b : null);
    const nameArC = pick('nameAr', 'name_ar');
    const nameEnC = pick('nameEn', 'name_en');
    const priceMC = pick('priceMonthly', 'price_monthly');
    const sortC = pick('sortOrder', 'sort_order');
    if (!nameArC || !nameEnC || !priceMC) {
      return NextResponse.json({ error: 'Plan schema incomplete' }, { status: 500 });
    }
    const planParts = ['id', nameArC, nameEnC, priceMC, sortC].filter(Boolean).map((c) => `"${c}"`).join(', ');
    const safePlanTable = `"${String(planTableName).replace(/"/g, '""')}"`;
    const planRows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT ${planParts} FROM ${safePlanTable} WHERE id = $1 LIMIT 1`,
      requestedPlanId
    );
    const requestedPlan = planRows?.[0];
    if (!requestedPlan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 400 });
    }
    const planNameAr = String(requestedPlan[nameArC] ?? '');
    const planNameEn = String(requestedPlan[nameEnC] ?? '');
    const planPrice = Number(requestedPlan[priceMC] ?? 0);
    const planSort = sortC && requestedPlan[sortC] != null ? Number(requestedPlan[sortC]) : 0;

    const subTable = await prisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND LOWER(table_name) = 'subscription' LIMIT 1
    `;
    const subTableName = subTable?.[0]?.table_name;
    if (!subTableName) {
      return NextResponse.json({ error: 'Subscription table not available' }, { status: 500 });
    }
    const subCols = await prisma.$queryRaw<{ column_name: string }[]>(
      Prisma.sql`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ${subTableName} ORDER BY ordinal_position`
    );
    const subColSet = new Set((subCols || []).map((c) => c.column_name));
    const userIdCol = subColSet.has('userId') ? 'userId' : subColSet.has('user_id') ? 'user_id' : null;
    const planIdCol = subColSet.has('planId') ? 'planId' : 'plan_id';
    const idCol = subColSet.has('id') ? 'id' : null;
    const startCol = subColSet.has('startAt') ? 'startAt' : subColSet.has('start_at') ? 'start_at' : null;
    const endCol = subColSet.has('endAt') ? 'endAt' : subColSet.has('end_at') ? 'end_at' : null;
    const receiptDocCol = subColSet.has('receiptDocumentId') ? 'receiptDocumentId' : null;
    if (!userIdCol || !planIdCol) {
      return NextResponse.json({ error: 'Subscription schema incomplete' }, { status: 500 });
    }
    const selectSub = [idCol, userIdCol, planIdCol, startCol, endCol, receiptDocCol].filter(Boolean).map((c) => `"${c}"`).join(', ');
    const safeSubTable = `"${String(subTableName).replace(/"/g, '""')}"`;
    const subRows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT ${selectSub} FROM ${safeSubTable} WHERE "${userIdCol}" = $1 LIMIT 1`,
      userId
    );
    const subRow = subRows?.[0];
    if (!subRow) {
      return NextResponse.json({ error: 'No active subscription' }, { status: 400 });
    }
    const currentPlanId = String(subRow[planIdCol] ?? '');
    const subId = idCol ? String(subRow[idCol] ?? '') : '';
    const currentStartAt = startCol && subRow[startCol] ? new Date(subRow[startCol] as string | Date) : new Date();
    const endAt = endCol && subRow[endCol] ? new Date(subRow[endCol] as string | Date) : new Date();

    const currentPlanRows = currentPlanId
      ? await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
          `SELECT ${planParts} FROM ${safePlanTable} WHERE id = $1 LIMIT 1`,
          currentPlanId
        )
      : [];
    const currentSort = currentPlanRows?.[0] && sortC ? Number(currentPlanRows[0][sortC]) : 0;

    if (direction === 'upgrade' && planSort <= currentSort) {
      return NextResponse.json({ error: 'الخطة المختارة ليست ترقية' }, { status: 400 });
    }
    if (direction === 'downgrade' && planSort >= currentSort) {
      return NextResponse.json({ error: 'الخطة المختارة ليست تنزيلاً' }, { status: 400 });
    }

    const amount =
      payment != null && typeof (payment as { amount?: unknown }).amount === 'number'
        ? (payment as { amount: number }).amount
        : direction === 'upgrade'
          ? planPrice
          : 0;
    const currency = payment?.currency || 'OMR';
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } }).catch(() => null);

    let receiptDocId: string | null = null;
    if (amount > 0) {
      try {
        const receiptResult = await createSubscriptionReceipt({
          userId,
          userEmail: user?.email ?? undefined,
          planNameAr,
          planNameEn,
          amount,
          currency,
          direction,
        });
        if (receiptResult?.docId) receiptDocId = receiptResult.docId;
      } catch (e) {
        console.error('Subscription receipt creation:', e);
      }
    }

    const currentPlanNameAr = currentPlanRows?.[0] && nameArC ? String(currentPlanRows[0][nameArC] ?? '') : '';
    const currentPlanNameEn = currentPlanRows?.[0] && nameEnC ? String(currentPlanRows[0][nameEnC] ?? '') : '';

    const currentSubReceiptId = receiptDocCol && subRow[receiptDocCol] ? String(subRow[receiptDocCol]) : null;
    if (direction === 'upgrade') {
      try {
        await prisma.subscriptionHistory.create({
          data: {
            userId,
            planId: currentPlanId,
            planNameAr: currentPlanNameAr || currentPlanId,
            planNameEn: currentPlanNameEn || currentPlanId,
            startAt: currentStartAt,
            endAt,
            amountPaid: null,
            receiptDocumentId: currentSubReceiptId,
          },
        });
      } catch (e) {
        console.error('Subscription history create (old period):', e);
      }
      const startAt = new Date();
      const newEndAt = new Date(startAt);
      newEndAt.setMonth(newEndAt.getMonth() + 12);
      const usageJson = JSON.stringify({ properties: 0, units: 0, bookings: 0, users: 0, storage: 0 });
      await prisma.subscription.upsert({
        where: { userId },
        create: {
          userId,
          planId: requestedPlanId,
          status: 'active',
          startAt,
          endAt: newEndAt,
          usageJson,
          receiptDocumentId: receiptDocId,
        },
        update: {
          planId: requestedPlanId,
          status: 'active',
          startAt,
          endAt: newEndAt,
          receiptDocumentId: receiptDocId,
        },
      });
      return NextResponse.json({ ok: true, message: 'تمت الترقية بنجاح' });
    }

    if (!subId) {
      return NextResponse.json({ error: 'Subscription id missing', details: 'Cannot schedule downgrade without subscription id' }, { status: 400 });
    }
    const existingScheduled = await prisma.subscriptionChangeRequest.findFirst({
      where: { userId, subscriptionId: subId, status: 'approved' },
    });
    const now = new Date();
    if (existingScheduled) {
      await prisma.subscriptionChangeRequest.updateMany({
        where: { userId, subscriptionId: subId },
        data: { requestedPlanId, direction: 'downgrade', status: 'approved', reviewedAt: now, reviewedById: userId },
      });
    } else {
      await prisma.subscriptionChangeRequest.create({
        data: {
          userId,
          subscriptionId: subId,
          requestedPlanId,
          direction: 'downgrade',
          status: 'approved',
          reviewedAt: now,
          reviewedById: userId,
        },
      });
    }
    return NextResponse.json({ ok: true, message: 'سيتم تطبيق الباقة الجديدة بعد انتهاء الفترة الحالية' });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('POST /api/subscriptions/me/change-with-payment:', e);
    return NextResponse.json({ error: 'Server error', details: msg }, { status: 500 });
  }
}
