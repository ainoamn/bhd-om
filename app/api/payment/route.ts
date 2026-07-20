/**
 * API موحد للدفع — 11 بوابة (عمان + الخليج + عالمي)
 * POST: إنشاء جلسة | GET: التحقق
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import {
  createPayment,
  verifyPayment,
  isValidProvider,
  isProviderActive,
  ALL_PROVIDERS,
  type GatewayProvider,
} from '@/lib/payment/manager';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const userId = auth.userId!;

    const body = await req.json();
    const { provider, amount, description, dueId, metadata } = body;

    if (!provider || amount == null || !description) {
      return NextResponse.json(
        { error: 'provider, amount, description مطلوبة' },
        { status: 400 }
      );
    }

    if (!isValidProvider(String(provider))) {
      return NextResponse.json(
        { error: `بوابة غير مدعومة. المتاحة: ${ALL_PROVIDERS.join(', ')}` },
        { status: 400 }
      );
    }

    const gateway = provider as GatewayProvider;
    if (!isProviderActive(gateway)) {
      return NextResponse.json({ error: `بوابة ${provider} غير مفعلة` }, { status: 400 });
    }

    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return NextResponse.json({ error: 'مبلغ غير صالح' }, { status: 400 });
    }

    const locale = 'ar';
    const baseUrl = (process.env.NEXTAUTH_URL || '').replace(/\/$/, '');
    const token = auth.token as { email?: string; phone?: string; name?: string } | null;

    const successQuery = new URLSearchParams({
      provider: gateway,
      userId,
      ...(dueId ? { dueId: String(dueId) } : {}),
    });
    const session = await createPayment(gateway, {
      amount: amountNum,
      description: String(description),
      customerEmail: String(token?.email || ''),
      customerPhone: token?.phone ? String(token.phone) : undefined,
      customerName: token?.name ? String(token.name) : undefined,
      metadata: {
        userId,
        dueId: dueId ? String(dueId) : '',
        type: 'rent',
        ...(metadata && typeof metadata === 'object' ? metadata : {}),
      },
      successUrl: `${baseUrl}/${locale}/portal/tenant/payment/success?${successQuery.toString()}`,
      cancelUrl: `${baseUrl}/${locale}/portal/tenant/payment/cancel`,
    });

    return NextResponse.json({
      success: true,
      checkoutUrl: session.checkoutUrl,
      sessionId: session.sessionId,
      reference: session.reference,
      provider: session.provider,
    });
  } catch (error) {
    console.error('[Payment API] Error:', error);
    return NextResponse.json(
      {
        error: 'فشل إنشاء جلسة الدفع',
        message: error instanceof Error ? error.message : 'خطأ غير معروف',
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const provider = searchParams.get('provider');

    if (!sessionId || !provider) {
      return NextResponse.json(
        { error: 'sessionId و provider مطلوبان' },
        { status: 400 }
      );
    }

    if (!isValidProvider(provider)) {
      return NextResponse.json({ error: `بوابة غير مدعومة: ${provider}` }, { status: 400 });
    }

    const result = await verifyPayment(provider, sessionId);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[Payment Verify] Error:', error);
    return NextResponse.json(
      {
        error: 'فشل التحقق من الدفع',
        message: error instanceof Error ? error.message : 'خطأ غير معروف',
      },
      { status: 500 }
    );
  }
}
