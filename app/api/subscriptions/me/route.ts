/**
 * اشتراك المستخدم الحالي + طلب ترقية/تنزيل
 * GET يقرأ الاشتراك والباقة باستعلامات خام لتفادي فشل Prisma عند اختلاف شكل الجداول
 */
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function parseJson<T>(raw: unknown, fallback: T): T {
  if (raw == null || typeof raw !== 'string') return fallback;
  try {
    const v = JSON.parse(raw) as T;
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV === 'development' ? 'bhd-dev-secret-not-for-production' : undefined),
    });
    if (!token?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = token.sub as string;

    const emptyRes = () =>
      NextResponse.json(
        { subscription: null, plans: [], pendingRequest: null },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', Pragma: 'no-cache' } }
      );

    const subTable = await prisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND LOWER(table_name) = 'subscription' LIMIT 1
    `;
    const subTableName = subTable?.[0]?.table_name;
    if (!subTableName) return emptyRes();

    const subCols = await prisma.$queryRaw<{ column_name: string }[]>(
      Prisma.sql`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ${subTableName} ORDER BY ordinal_position`
    );
    const subColSet = new Set((subCols || []).map((c) => c.column_name));
    const userIdCol = subColSet.has('userId') ? 'userId' : subColSet.has('user_id') ? 'user_id' : null;
    if (!userIdCol || !subColSet.has('planId') && !subColSet.has('plan_id')) return emptyRes();

    const planIdCol = subColSet.has('planId') ? 'planId' : 'plan_id';
    const idCol = subColSet.has('id') ? 'id' : null;
    const statusCol = subColSet.has('status') ? 'status' : null;
    const startCol = subColSet.has('startAt') ? 'startAt' : subColSet.has('start_at') ? 'start_at' : null;
    const endCol = subColSet.has('endAt') ? 'endAt' : subColSet.has('end_at') ? 'end_at' : null;
    const usageCol = subColSet.has('usageJson') ? 'usageJson' : subColSet.has('usage_json') ? 'usage_json' : null;
    const receiptDocCol = subColSet.has('receiptDocumentId') ? 'receiptDocumentId' : null;
    const selectSub = [idCol, userIdCol, planIdCol, statusCol, startCol, endCol, usageCol, receiptDocCol].filter(Boolean).map((c) => `"${c}"`).join(', ');
    const safeSubTable = `"${String(subTableName).replace(/"/g, '""')}"`;

    const subRows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT ${selectSub} FROM ${safeSubTable} WHERE "${userIdCol}" = $1 LIMIT 1`,
      userId
    );
    let subRow = subRows?.[0];
    if (!subRow) return emptyRes();

    let planId = String(subRow[planIdCol] ?? '');
    const subId = idCol ? String(subRow[idCol] ?? '') : '';
    let status = statusCol ? String(subRow[statusCol] ?? 'active') : 'active';
    let startAt = startCol && subRow[startCol] ? new Date(subRow[startCol] as string | Date).toISOString() : new Date().toISOString();
    let endAt = endCol && subRow[endCol] ? new Date(subRow[endCol] as string | Date).toISOString() : new Date().toISOString();
    let usage = usageCol && subRow[usageCol] ? parseJson(subRow[usageCol], {} as Record<string, number>) : {};

    // تطبيق تنزيل مجدول عند انتهاء الفترة الحالية (اليوم التالي لانتهاء الاشتراك يُطبّق تلقائياً عند الطلب أو من لوحة الإدارة).
    // ملاحظة: الاحتفاظ بنسخة بيانات المستخدم لمدة شهر بعد انتهاء/تنزيل الباقة ثم أرشفتها يُنفّذ عبر job منفصل (راجع docs/subscription-data-retention إن وُجد).
    if (subId && new Date(endAt) <= new Date()) {
      const changeReq = await prisma.subscriptionChangeRequest.findFirst({
        where: { subscriptionId: subId, status: 'approved' },
      }).catch(() => null);
      if (changeReq) {
        const currentPlan = await prisma.plan.findUnique({ where: { id: planId } }).catch(() => null);
        try {
          await prisma.subscriptionHistory.create({
            data: {
              userId,
              planId,
              planNameAr: currentPlan?.nameAr ?? planId,
              planNameEn: currentPlan?.nameEn ?? planId,
              startAt: new Date(startAt),
              endAt: new Date(endAt),
              amountPaid: null,
              receiptDocumentId: null,
            },
          });
        } catch (e) {
          console.error('Subscription history create (on downgrade apply):', e);
        }
        const newStart = new Date();
        const newEnd = new Date(newStart);
        newEnd.setMonth(newEnd.getMonth() + 12);
        await prisma.subscription.update({
          where: { id: subId },
          data: { planId: changeReq.requestedPlanId, startAt: newStart, endAt: newEnd, receiptDocumentId: null },
        }).catch(() => {});
        await prisma.subscriptionChangeRequest.update({
          where: { id: changeReq.id },
          data: { status: 'applied' },
        }).catch(() => {});
        const refreshed = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
          `SELECT ${selectSub} FROM ${safeSubTable} WHERE "${userIdCol}" = $1 LIMIT 1`,
          userId
        );
        subRow = refreshed?.[0];
        if (subRow) {
          planId = String(subRow[planIdCol] ?? '');
          status = statusCol ? String(subRow[statusCol] ?? 'active') : 'active';
          startAt = startCol && subRow[startCol] ? new Date(subRow[startCol] as string | Date).toISOString() : new Date().toISOString();
          endAt = endCol && subRow[endCol] ? new Date(subRow[endCol] as string | Date).toISOString() : new Date().toISOString();
          usage = usageCol && subRow[usageCol] ? parseJson(subRow[usageCol], {} as Record<string, number>) : {};
        }
      }
    }

    let plan: { id: string; code: string; nameAr: string; nameEn: string; priceMonthly: number; priceYearly?: number; currency: string; features: string[]; limits: Record<string, number> } | null = null;
    const planTable = await prisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND LOWER(table_name) = 'plan' LIMIT 1
    `;
    const planTableName = planTable?.[0]?.table_name;
    if (planId && planTableName) {
      const planCols = await prisma.$queryRaw<{ column_name: string }[]>(
        Prisma.sql`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ${planTableName} ORDER BY ordinal_position`
      );
      const planColSet = new Set((planCols || []).map((c) => c.column_name));
      const pick = (a: string, b: string) => (planColSet.has(a) ? a : planColSet.has(b) ? b : null);
      const idC = planColSet.has('id') ? 'id' : null;
      const codeC = pick('code', 'code');
      const nameArC = pick('nameAr', 'name_ar');
      const nameEnC = pick('nameEn', 'name_en');
      const priceMC = pick('priceMonthly', 'price_monthly');
      const priceYC = pick('priceYearly', 'price_yearly');
      const currC = pick('currency', 'currency');
      const featC = pick('featuresJson', 'features_json');
      const limC = pick('limitsJson', 'limits_json');
      if (idC && codeC && nameArC && nameEnC && priceMC) {
        const parts = [idC, codeC, nameArC, nameEnC, priceMC, priceYC, currC, featC, limC].filter(Boolean).map((c) => `"${c}"`).join(', ');
        const safePlanTable = `"${String(planTableName).replace(/"/g, '""')}"`;
        const planRows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
          `SELECT ${parts} FROM ${safePlanTable} WHERE id = $1 LIMIT 1`,
          planId
        );
        const p = planRows?.[0];
        if (p) {
          plan = {
            id: planId,
            code: String(p[codeC] ?? ''),
            nameAr: String(p[nameArC] ?? ''),
            nameEn: String(p[nameEnC] ?? ''),
            priceMonthly: Number(p[priceMC] ?? 0),
            priceYearly: priceYC && p[priceYC] != null ? Number(p[priceYC]) : undefined,
            currency: String((currC && p[currC]) ?? 'OMR'),
            features: parseJson<string[]>(featC ? p[featC] : null, []),
            limits: parseJson<Record<string, number>>(limC ? p[limC] : null, {}),
          };
        }
      }
    }
    if (!plan) {
      plan = { id: planId, code: '', nameAr: '', nameEn: '', priceMonthly: 0, currency: 'OMR', features: [], limits: {} };
    }

    const receiptDocumentId = receiptDocCol && subRow[receiptDocCol] ? String(subRow[receiptDocCol]) : null;
    const subscription = {
      id: subId,
      planId,
      status,
      startAt,
      endAt,
      usage,
      plan,
      receiptDocumentId: receiptDocumentId || undefined,
      permissionIds: [] as string[],
    };

    const plansRes = await fetch(`${req.nextUrl.origin}/api/plans`, { cache: 'no-store', headers: { cookie: req.headers.get('cookie') || '' } }).then((r) => r.json()).catch(() => ({ list: [] }));
    const plansList = Array.isArray(plansRes?.list) ? plansRes.list : [];

    const subscriptionHistory = await prisma.subscriptionHistory.findMany({
      where: { userId },
      orderBy: { endAt: 'desc' },
      take: 50,
    }).catch(() => []);

    return NextResponse.json(
      {
        subscription,
        plans: plansList.map((p: { id: string; code: string; nameAr?: string; nameEn?: string; priceMonthly?: number; priceYearly?: number; currency?: string; features?: string[]; limits?: Record<string, number>; sortOrder?: number }) => ({
          id: p.id,
          code: p.code,
          nameAr: p.nameAr ?? '',
          nameEn: p.nameEn ?? '',
          priceMonthly: Number(p.priceMonthly) ?? 0,
          priceYearly: p.priceYearly != null ? Number(p.priceYearly) : undefined,
          currency: p.currency ?? 'OMR',
          features: p.features ?? [],
          limits: p.limits ?? {},
          sortOrder: typeof p.sortOrder === 'number' ? p.sortOrder : 0,
        })),
        pendingRequest: null,
        subscriptionHistory: subscriptionHistory.map((h) => ({
          id: h.id,
          planId: h.planId,
          planNameAr: h.planNameAr,
          planNameEn: h.planNameEn,
          startAt: h.startAt.toISOString(),
          endAt: h.endAt.toISOString(),
          amountPaid: h.amountPaid ?? null,
          receiptDocumentId: h.receiptDocumentId ?? null,
        })),
      },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', Pragma: 'no-cache' } }
    );
  } catch (e) {
    console.error('GET /api/subscriptions/me:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
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
    const { requestedPlanId, direction, reason, planId, durationMonths } = body as {
      requestedPlanId?: string;
      direction?: string;
      reason?: string;
      planId?: string;
      durationMonths?: number;
    };

    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    // إنشاء اشتراك جديد عند عدم وجود اشتراك (من صفحة الباقات العامة)
    if (!subscription) {
      const initialPlanId = planId || requestedPlanId;
      if (!initialPlanId) {
        return NextResponse.json({ error: 'planId required for new subscription' }, { status: 400 });
      }
      const plan = await prisma.plan.findUnique({ where: { id: initialPlanId } });
      if (!plan) {
        return NextResponse.json({ error: 'Plan not found' }, { status: 400 });
      }
      const months = Math.max(1, Math.min(120, Number(durationMonths) || 12));
      const startAt = new Date();
      const endAt = new Date(startAt);
      endAt.setMonth(endAt.getMonth() + months);
      await prisma.subscription.create({
        data: {
          userId,
          planId: initialPlanId,
          status: 'active',
          startAt,
          endAt,
          usageJson: JSON.stringify({ properties: 0, units: 0, bookings: 0, users: 1, storage: 0 }),
        },
      });
      return NextResponse.json({ ok: true, message: 'تم تفعيل الاشتراك بنجاح' });
    }

    // طلب ترقية/تنزيل عند وجود اشتراك
    if (!requestedPlanId || !direction || !['upgrade', 'downgrade'].includes(direction)) {
      return NextResponse.json({ error: 'requestedPlanId and direction (upgrade|downgrade) required' }, { status: 400 });
    }

    const planExists = await prisma.plan.findUnique({ where: { id: requestedPlanId } });
    if (!planExists) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 400 });
    }

    const existingPending = await prisma.subscriptionChangeRequest.findFirst({
      where: { userId, status: 'pending' },
    });
    if (existingPending) {
      return NextResponse.json({ error: 'لديك طلب قيد المراجعة بالفعل' }, { status: 400 });
    }

    await prisma.subscriptionChangeRequest.create({
      data: {
        userId,
        subscriptionId: subscription.id,
        requestedPlanId,
        direction,
        reason: reason ?? null,
        status: 'pending',
      },
    });
    return NextResponse.json({ ok: true, message: 'تم إرسال الطلب بنجاح' });
  } catch (e) {
    console.error('POST /api/subscriptions/me:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
