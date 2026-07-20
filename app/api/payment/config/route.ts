/**
 * API: إدارة إعدادات بوابات الدفع (CRUD + القيود المحاسبية)
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRoles } from '@/lib/auth/guard';
import { prisma } from '@/lib/prisma';
import { isMaskedSecret } from '@/lib/payment/credentials';

export const dynamic = 'force-dynamic';

async function requirePaymentAdmin(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const forbidden = requireRoles(auth, ['ADMIN', 'SUPER_ADMIN']);
  if (forbidden) return forbidden;
  return auth;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requirePaymentAdmin(req);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const provider = searchParams.get('provider');
    const accounting = searchParams.get('accounting') === 'true';
    const days = Math.min(365, Math.max(1, Number(searchParams.get('days') || 30)));

    if (accounting) {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const entries = await prisma.accountingJournalEntry.findMany({
        where: {
          createdAt: { gte: since },
          serialNumber: { startsWith: 'PAY-' },
        },
        include: {
          lines: {
            include: {
              account: { select: { nameAr: true, nameEn: true, code: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      });

      return NextResponse.json({ entries, count: entries.length });
    }

    if (provider) {
      const config = await prisma.paymentGatewayConfig.findUnique({ where: { provider } });
      if (!config) {
        return NextResponse.json({ config: getDefaultConfig(provider) });
      }
      return NextResponse.json({ config: sanitizeConfig(config) });
    }

    const configs = await prisma.paymentGatewayConfig.findMany({ orderBy: { createdAt: 'asc' } });
    return NextResponse.json({
      configs: configs.map(sanitizeConfig),
      count: configs.length,
    });
  } catch (error) {
    console.error('[Payment Config GET] Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requirePaymentAdmin(req);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const provider = String(body.provider || '');
    if (!provider) {
      return NextResponse.json({ error: 'provider مطلوب' }, { status: 400 });
    }

    const existing = await prisma.paymentGatewayConfig.findUnique({ where: { provider } });

    const data = {
      isEnabled: body.isEnabled ?? existing?.isEnabled ?? false,
      displayNameAr: body.displayNameAr || existing?.displayNameAr || getDefaultNameAr(provider),
      displayNameEn: body.displayNameEn || existing?.displayNameEn || getDefaultNameEn(provider),
      apiKey: pickSecret(body.apiKey, existing?.apiKey),
      apiSecret: pickSecret(body.apiSecret, existing?.apiSecret),
      merchantId: pickSecret(body.merchantId, existing?.merchantId),
      storeKey: pickSecret(body.storeKey, existing?.storeKey),
      outletRef: pickSecret(body.outletRef, existing?.outletRef),
      profileId: pickSecret(body.profileId, existing?.profileId),
      entityId: pickSecret(body.entityId, existing?.entityId),
      accessToken: pickSecret(body.accessToken, existing?.accessToken),
      publicKey: pickSecret(body.publicKey, existing?.publicKey),
      sandbox: body.sandbox ?? existing?.sandbox ?? true,
      webhookUrl: body.webhookUrl ?? existing?.webhookUrl ?? '',
      successUrl: body.successUrl ?? existing?.successUrl ?? '',
      cancelUrl: body.cancelUrl ?? existing?.cancelUrl ?? '',
      metadata: body.metadata ?? existing?.metadata ?? '',
      updatedBy: auth.userId || 'admin',
    };

    const config = await prisma.paymentGatewayConfig.upsert({
      where: { provider },
      update: data,
      create: { provider, ...data },
    });

    return NextResponse.json({
      success: true,
      config: sanitizeConfig(config),
      message: 'تم حفظ الإعدادات بنجاح',
    });
  } catch (error) {
    console.error('[Payment Config POST] Error:', error);
    return NextResponse.json(
      { error: 'فشل حفظ الإعدادات', message: error instanceof Error ? error.message : '' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requirePaymentAdmin(req);
    if (auth instanceof NextResponse) return auth;

    const { provider, isEnabled } = await req.json();
    if (!provider) {
      return NextResponse.json({ error: 'provider مطلوب' }, { status: 400 });
    }

    const existing = await prisma.paymentGatewayConfig.findUnique({ where: { provider } });
    const nextEnabled = isEnabled ?? !existing?.isEnabled;

    const config = await prisma.paymentGatewayConfig.upsert({
      where: { provider },
      update: { isEnabled: nextEnabled, updatedBy: auth.userId || 'admin' },
      create: {
        provider,
        isEnabled: nextEnabled,
        displayNameAr: getDefaultNameAr(provider),
        displayNameEn: getDefaultNameEn(provider),
        updatedBy: auth.userId || 'admin',
      },
    });

    return NextResponse.json({
      success: true,
      isEnabled: config.isEnabled,
      message: config.isEnabled ? 'تم تفعيل البوابة' : 'تم إيقاف البوابة',
    });
  } catch (error) {
    console.error('[Payment Config PUT] Error:', error);
    return NextResponse.json({ error: 'فشل التحديث' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requirePaymentAdmin(req);
    if (auth instanceof NextResponse) return auth;

    const provider = req.nextUrl.searchParams.get('provider');
    if (!provider) {
      return NextResponse.json({ error: 'provider مطلوب' }, { status: 400 });
    }

    await prisma.paymentGatewayConfig.delete({ where: { provider } });
    return NextResponse.json({ success: true, message: 'تم حذف الإعدادات' });
  } catch (error) {
    return NextResponse.json({ error: 'فشل الحذف' }, { status: 500 });
  }
}

function pickSecret(incoming: unknown, existing?: string | null): string {
  const value = String(incoming ?? '').trim();
  if (!value || isMaskedSecret(value)) return str(existing);
  return value;
}

function str(value: string | null | undefined): string {
  return (value || '').trim();
}

function sanitizeConfig(config: {
  id: string;
  provider: string;
  isEnabled: boolean;
  displayNameAr: string;
  displayNameEn: string;
  apiKey: string | null;
  apiSecret: string | null;
  merchantId: string | null;
  storeKey: string | null;
  outletRef: string | null;
  profileId: string | null;
  entityId: string | null;
  accessToken: string | null;
  publicKey: string | null;
  sandbox: boolean;
  webhookUrl: string | null;
  successUrl: string | null;
  cancelUrl: string | null;
  metadata: string | null;
  lastTestedAt: Date | null;
  lastTestResult: string | null;
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string | null;
}) {
  return {
    ...config,
    apiSecret: maskSecret(config.apiSecret),
    accessToken: maskSecret(config.accessToken),
    storeKey: maskSecret(config.storeKey),
    publicKey: maskSecret(config.publicKey),
  };
}

function maskSecret(value: string | null | undefined): string {
  const strValue = (value || '').trim();
  if (!strValue) return '';
  if (strValue.length <= 8) return '****';
  return `${strValue.slice(0, 4)}****${strValue.slice(-4)}`;
}

function getDefaultConfig(provider: string) {
  return {
    provider,
    isEnabled: false,
    displayNameAr: getDefaultNameAr(provider),
    displayNameEn: getDefaultNameEn(provider),
    apiKey: '',
    apiSecret: '',
    merchantId: '',
    storeKey: '',
    outletRef: '',
    profileId: '',
    entityId: '',
    accessToken: '',
    publicKey: '',
    sandbox: true,
    webhookUrl: '',
    successUrl: '',
    cancelUrl: '',
    metadata: '',
    lastTestedAt: null,
    lastTestResult: '',
  };
}

function getDefaultNameAr(provider: string): string {
  const map: Record<string, string> = {
    thawani: 'ثواني',
    stripe: 'سترايب',
    paypal: 'باي بال',
    telr: 'تلر',
    cmi: 'بوابة الدفع الوطنية',
    'network-intl': 'نتورك إنترناشيونال',
    hyperpay: 'هايبر باي',
    payfort: 'أمازون للمدفوعات',
    myfatoorah: 'فاتورتي',
    paytabs: 'بيتابس',
    tap: 'تاب للمدفوعات',
  };
  return map[provider] || provider;
}

function getDefaultNameEn(provider: string): string {
  const map: Record<string, string> = {
    thawani: 'Thawani',
    stripe: 'Stripe',
    paypal: 'PayPal',
    telr: 'Telr',
    cmi: 'CMI / Oman Payment Gateway',
    'network-intl': 'Network International',
    hyperpay: 'HyperPay',
    payfort: 'Amazon Payment Services',
    myfatoorah: 'MyFatoorah',
    paytabs: 'PayTabs',
    tap: 'Tap Payments',
  };
  return map[provider] || provider;
}
