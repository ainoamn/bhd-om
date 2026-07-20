/**
 * API Route: نظام تقييم المستأجر الذكي
 * يحسب تقييماً تلقائياً بناءً على:
 * - الالتزام بدفع الإيجار (RENT_PAYMENT)
 * - الالتزام بدفع الفواتير (BILL_PAYMENT)
 * - طلبات الصيانة (MAINTENANCE)
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRoles } from '@/lib/auth/guard';
import { prisma } from '@/lib/prisma';
import type { ScoreCategory, ScoreLevel } from '@prisma/client';

/** تحديد مستوى التقييم */
function getScoreLevel(score: number): ScoreLevel {
  if (score >= 90) return 'EXCELLENT';
  if (score >= 70) return 'GOOD';
  if (score >= 50) return 'AVERAGE';
  if (score >= 30) return 'POOR';
  return 'CRITICAL';
}

async function upsertScore(
  tenantId: string,
  category: ScoreCategory,
  score: number,
  notes: string
) {
  const level = getScoreLevel(score);
  return prisma.tenantScore.upsert({
    where: { tenantUserId_category: { tenantUserId: tenantId, category } },
    update: { score, level, notes },
    create: { tenantUserId: tenantId, category, score, level, notes },
  });
}

/** حساب تقييم الإيجار */
async function calculateRentScore(tenantId: string): Promise<{ score: number; notes: string }> {
  const dues = await prisma.dueAmount.findMany({
    where: { userId: tenantId, type: 'RENT' },
  });

  if (dues.length === 0) return { score: 100, notes: 'لا يوجد سجل إيجارات — تقييم افتراضي ممتاز' };

  const total = dues.length;
  const paidOnTime = dues.filter((d) => d.status === 'PAID' && d.paidAt && d.paidAt <= d.dueDate).length;
  const overdue = dues.filter((d) => d.status === 'OVERDUE').length;
  const paidLate = dues.filter((d) => d.status === 'PAID' && d.paidAt && d.paidAt > d.dueDate).length;

  let score = Math.round((paidOnTime / total) * 100);
  score -= overdue * 15;
  score -= paidLate * 5;
  score = Math.max(0, Math.min(100, score));

  let notes = '';
  if (overdue > 2) notes = `⚠️ ${overdue} دفعات متأخرة — يحتاج متابعة`;
  else if (overdue > 0) notes = `ℹ️ ${overdue} دفعة متأخرة`;
  else if (paidLate > 0) notes = `✅ يدفع ولكن بتأخير (${paidLate} مرة)`;
  else notes = '✅ ممتاز — يدفع في موعده';

  return { score, notes };
}

/** حساب تقييم الفواتير */
async function calculateBillScore(tenantId: string): Promise<{ score: number; notes: string }> {
  const dues = await prisma.dueAmount.findMany({
    where: { userId: tenantId, type: 'BILL' },
  });

  if (dues.length === 0) return { score: 100, notes: 'لا يوجد فواتير — تقييم افتراضي ممتاز' };

  const total = dues.length;
  const paid = dues.filter((d) => d.status === 'PAID').length;
  const overdue = dues.filter((d) => d.status === 'OVERDUE').length;

  let score = Math.round((paid / total) * 100);
  score -= overdue * 10;
  score = Math.max(0, Math.min(100, score));

  let notes = '';
  if (overdue > 2) notes = `⚠️ ${overdue} فواتير متأخرة`;
  else if (overdue > 0) notes = `ℹ️ ${overdue} فاتورة متأخرة`;
  else notes = '✅ ممتاز — يدفع الفواتير في موعدها';

  return { score, notes };
}

/** حساب تقييم الصيانة */
async function calculateMaintenanceScore(tenantId: string): Promise<{ score: number; notes: string }> {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const tasks = await prisma.tenantTask.findMany({
    where: { assigneeId: tenantId, type: 'MAINTENANCE', createdAt: { gte: sixMonthsAgo } },
  });

  const count = tasks.length;
  let score = 100;
  if (count > 10) score = 30;
  else if (count > 6) score = 50;
  else if (count > 3) score = 75;
  else score = 95;

  let notes = '';
  if (count > 10) notes = `⚠️ ${count} طلبات صيانة في 6 أشهر — كثرة الطلبات مفرطة`;
  else if (count > 6) notes = `ℹ️ ${count} طلبات صيانة — معدل مرتفع`;
  else if (count > 0) notes = `✅ ${count} طلبات صيانة — معدل معقول`;
  else notes = '✅ لا يوجد طلبات صيانة — ممتاز';

  return { score, notes };
}

function calculateOverall(rent: number, bill: number, maint: number): { score: number; notes: string } {
  const score = Math.round(rent * 0.5 + bill * 0.3 + maint * 0.2);
  let notes = '';
  if (score >= 90) notes = '⭐⭐⭐ ممتاز — مستأجر مثالي';
  else if (score >= 70) notes = '⭐⭐ جيد — يمكن الاعتماد عليه';
  else if (score >= 50) notes = '⭐ متوسط — يحتاج متابعة';
  else notes = '⚠️ ضعيف — يحتاج مراجعة عاجلة';
  return { score, notes };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const forbidden = requireRoles(auth, [
      'ADMIN',
      'SUPER_ADMIN',
      'COMPANY',
      'ORG_MANAGER',
      'OWNER',
      'LANDLORD',
      'CLIENT',
    ]);
    if (forbidden) return forbidden;

    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenantId') || auth.userId!;
    if (!tenantId) return NextResponse.json({ error: 'tenantId required' }, { status: 400 });

    // المستأجر يرى تقييمه فقط
    if (auth.role === 'CLIENT' && tenantId !== auth.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [rent, bill, maint] = await Promise.all([
      calculateRentScore(tenantId),
      calculateBillScore(tenantId),
      calculateMaintenanceScore(tenantId),
    ]);

    const overall = calculateOverall(rent.score, bill.score, maint.score);
    const now = new Date();

    await Promise.all([
      upsertScore(tenantId, 'RENT_PAYMENT', rent.score, rent.notes),
      upsertScore(tenantId, 'BILL_PAYMENT', bill.score, bill.notes),
      upsertScore(tenantId, 'MAINTENANCE', maint.score, maint.notes),
      upsertScore(tenantId, 'OVERALL', overall.score, overall.notes),
    ]);

    return NextResponse.json({
      tenantId,
      overall: { score: overall.score, level: getScoreLevel(overall.score), notes: overall.notes },
      rent: { score: rent.score, level: getScoreLevel(rent.score), notes: rent.notes },
      bill: { score: bill.score, level: getScoreLevel(bill.score), notes: bill.notes },
      maintenance: { score: maint.score, level: getScoreLevel(maint.score), notes: maint.notes },
      updatedAt: now,
    });
  } catch (error) {
    console.error('[TenantScore] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
