/**
 * API Route: اختبار اتصال بوابة الدفع
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRoles } from '@/lib/auth/guard';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const forbidden = requireRoles(auth, ['ADMIN', 'SUPER_ADMIN']);
    if (forbidden) return forbidden;

    const { provider } = await req.json();
    if (!provider) {
      return NextResponse.json({ error: 'provider مطلوب' }, { status: 400 });
    }

    const config = await prisma.paymentGatewayConfig.findUnique({ where: { provider } });
    if (!config) {
      return NextResponse.json({
        ok: false,
        status: 'not_configured',
        message: 'البوابة غير مكونة — أضف الإعدادات أولاً',
      });
    }

    await prisma.paymentGatewayConfig.update({
      where: { provider },
      data: { lastTestedAt: new Date() },
    });

    let result: { ok: boolean; status: string; message: string };
    try {
      switch (provider) {
        case 'thawani':
          result = await testThawani(config);
          break;
        case 'stripe':
          result = await testStripe(config);
          break;
        case 'paypal':
          result = await testPayPal(config);
          break;
        case 'telr':
          result = await testTelr(config);
          break;
        case 'cmi':
          result = await testCMI(config);
          break;
        case 'network-intl':
          result = await testNetworkIntl(config);
          break;
        case 'hyperpay':
          result = await testHyperPay(config);
          break;
        case 'payfort':
          result = await testPayFort(config);
          break;
        case 'myfatoorah':
          result = await testMyFatoorah(config);
          break;
        case 'paytabs':
          result = await testPayTabs(config);
          break;
        case 'tap':
          result = await testTap(config);
          break;
        default:
          result = { ok: false, status: 'unknown_provider', message: 'بوابة غير معروفة' };
      }
    } catch (e) {
      result = { ok: false, status: 'error', message: e instanceof Error ? e.message : 'Unknown' };
    }

    await prisma.paymentGatewayConfig.update({
      where: { provider },
      data: {
        lastTestedAt: new Date(),
        lastTestResult: result.ok ? 'ok' : result.message,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Payment Test] Error:', error);
    return NextResponse.json(
      { ok: false, status: 'error', message: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

type GatewayConfig = {
  apiKey?: string | null;
  apiSecret?: string | null;
  merchantId?: string | null;
  storeKey?: string | null;
  outletRef?: string | null;
  profileId?: string | null;
  entityId?: string | null;
  accessToken?: string | null;
  sandbox?: boolean | null;
};

async function testThawani(config: GatewayConfig) {
  if (!config.apiSecret) return { ok: false, status: 'missing_credentials', message: 'مفتاح Thawani غير مكون' };
  const baseUrl = config.sandbox !== false ? 'https://uatcheckout.thawani.om' : 'https://checkout.thawani.om';
  const res = await fetch(`${baseUrl}/api/v1/checkout/session`, {
    method: 'HEAD',
    headers: { 'thawani-api-key': config.apiSecret },
  });
  return res.ok || res.status === 405
    ? { ok: true, status: 'connected', message: 'متصل بـ Thawani' }
    : { ok: false, status: 'auth_failed', message: 'فشل المصادقة — تحقق من المفتاح' };
}

async function testStripe(config: GatewayConfig) {
  if (!config.apiSecret) return { ok: false, status: 'missing_credentials', message: 'مفتاح Stripe غير مكون' };
  const res = await fetch('https://api.stripe.com/v1/account', {
    headers: { Authorization: `Bearer ${config.apiSecret}` },
  });
  if (res.ok) {
    const data = (await res.json()) as { settings?: { dashboard?: { display_name?: string } } };
    return { ok: true, status: 'connected', message: `متصل — ${data.settings?.dashboard?.display_name || 'Stripe'}` };
  }
  return { ok: false, status: 'auth_failed', message: 'فشل المصادقة — تحقق من المفتاح' };
}

async function testPayPal(config: GatewayConfig) {
  if (!config.apiKey || !config.apiSecret) {
    return { ok: false, status: 'missing_credentials', message: 'Client ID أو Secret مفقود' };
  }
  const baseUrl = config.sandbox !== false ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
  const auth = Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64');
  const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  if (res.ok) {
    const data = (await res.json()) as { app_id?: string };
    return { ok: true, status: 'connected', message: `متصل — App: ${data.app_id || 'PayPal'}` };
  }
  return { ok: false, status: 'auth_failed', message: 'فشل المصادقة' };
}

async function testTelr(config: GatewayConfig) {
  if (!config.merchantId || !config.apiSecret) {
    return { ok: false, status: 'missing_credentials', message: 'Store ID أو Auth Key مفقود' };
  }
  return { ok: true, status: 'manual_check', message: 'Telr يتطلب فاتورة حقيقية — الإعدادات موجودة' };
}

async function testCMI(config: GatewayConfig) {
  if (!config.merchantId || !config.storeKey) {
    return { ok: false, status: 'missing_credentials', message: 'Merchant ID أو Store Key مفقود' };
  }
  return { ok: true, status: 'manual_check', message: 'CMI يتطلب setup من البنك — الإعدادات موجودة' };
}

async function testNetworkIntl(config: GatewayConfig) {
  if (!config.apiSecret || !config.outletRef) {
    return { ok: false, status: 'missing_credentials', message: 'API Key أو Outlet Ref مفقود' };
  }
  const res = await fetch('https://api-gateway.sandbox.ngenius-payments.com/identity/auth/access-token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${config.apiSecret}`,
      'Content-Type': 'application/vnd.ni-identity.v1+json',
    },
  });
  return res.ok
    ? { ok: true, status: 'connected', message: 'متصل بـ Network International' }
    : { ok: false, status: 'auth_failed', message: 'فشل المصادقة' };
}

async function testHyperPay(config: GatewayConfig) {
  if (!config.entityId || !config.accessToken) {
    return { ok: false, status: 'missing_credentials', message: 'Entity ID أو Access Token مفقود' };
  }
  const baseUrl = config.sandbox !== false ? 'https://eu-test.oppwa.com' : 'https://eu-prod.oppwa.com';
  const res = await fetch(`${baseUrl}/v1/checkouts?entityId=${config.entityId}`, {
    headers: { Authorization: `Bearer ${config.accessToken}` },
  });
  return res.ok || res.status === 400
    ? { ok: true, status: 'connected', message: 'متصل بـ HyperPay' }
    : { ok: false, status: 'auth_failed', message: 'فشل المصادقة' };
}

async function testPayFort(config: GatewayConfig) {
  if (!config.merchantId || !config.accessToken) {
    return { ok: false, status: 'missing_credentials', message: 'Merchant Identifier أو Access Code مفقود' };
  }
  return { ok: true, status: 'manual_check', message: 'PayFort يتطلب setup — الإعدادات موجودة' };
}

async function testMyFatoorah(config: GatewayConfig) {
  if (!config.apiSecret) return { ok: false, status: 'missing_credentials', message: 'API Token مفقود' };
  const baseUrl = config.sandbox !== false ? 'https://apitest.myfatoorah.com' : 'https://api.myfatoorah.com';
  const res = await fetch(`${baseUrl}/v2/GetPaymentMethods`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.apiSecret}`, 'Content-Type': 'application/json' },
    body: '{}',
  });
  return res.ok
    ? { ok: true, status: 'connected', message: 'متصل بـ MyFatoorah' }
    : { ok: false, status: 'auth_failed', message: 'فشل المصادقة' };
}

async function testPayTabs(config: GatewayConfig) {
  if (!config.profileId || !config.apiSecret) {
    return { ok: false, status: 'missing_credentials', message: 'Profile ID أو Server Key مفقود' };
  }
  const res = await fetch('https://secure-global.paytabs.com/payment/list', {
    method: 'POST',
    headers: { authorization: config.apiSecret, 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile_id: config.profileId }),
  });
  return res.ok
    ? { ok: true, status: 'connected', message: 'متصل بـ PayTabs' }
    : { ok: false, status: 'auth_failed', message: 'فشل المصادقة' };
}

async function testTap(config: GatewayConfig) {
  if (!config.apiSecret) return { ok: false, status: 'missing_credentials', message: 'Secret Key مفقود' };
  const res = await fetch('https://api.tap.company/v2/charges/list', {
    headers: { Authorization: `Bearer ${config.apiSecret}` },
  });
  return res.ok
    ? { ok: true, status: 'connected', message: 'متصل بـ Tap Payments' }
    : { ok: false, status: 'auth_failed', message: 'فشل المصادقة' };
}
