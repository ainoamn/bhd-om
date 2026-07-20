import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRoles } from '@/lib/auth/guard';
import { getPaymentGatewayStatus } from '@/lib/server/paymentGateway';
import { getAllProviders, healthCheckAll, type PaymentProvider } from '@/lib/payment/manager';
import { getPaymentsSummary } from '@/lib/payment/accounting-link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const PROVIDER_ENV_VARS: Record<PaymentProvider, string[]> = {
  thawani: ['THAWANI_SECRET_KEY', 'THAWANI_PUBLISHABLE_KEY'],
  stripe: ['STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY'],
  paypal: ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET'],
  telr: ['TELR_STORE_ID', 'TELR_AUTH_KEY'],
  cmi: ['CMI_MERCHANT_ID', 'CMI_API_KEY', 'CMI_STORE_KEY'],
  'network-intl': ['NI_API_KEY', 'NI_OUTLET_REF'],
  hyperpay: ['HYPERPAY_ENTITY_ID', 'HYPERPAY_ACCESS_TOKEN'],
  payfort: ['PAYFORT_MERCHANT_IDENTIFIER', 'PAYFORT_ACCESS_CODE'],
  myfatoorah: ['MF_API_KEY'],
  paytabs: ['PAYTABS_PROFILE_ID', 'PAYTABS_SERVER_KEY'],
  tap: ['TAP_SECRET_KEY', 'TAP_PUBLIC_KEY'],
};

const PROVIDER_LABELS: Record<string, { ar: string; icon: string }> = {
  thawani: { ar: 'ثواني', icon: '🇴🇲' },
  stripe: { ar: 'سترايب', icon: '💳' },
  paypal: { ar: 'باي بال', icon: '🅿️' },
  telr: { ar: 'تلر', icon: '🔒' },
  cmi: { ar: 'بوابة الدفع الوطنية', icon: '🏦' },
  'network-intl': { ar: 'نتورك إنترناشيونال', icon: '🌐' },
  hyperpay: { ar: 'هايبر باي', icon: '⚡' },
  payfort: { ar: 'أمازون للمدفوعات', icon: '📱' },
  myfatoorah: { ar: 'فاتورتي', icon: '🧾' },
  paytabs: { ar: 'بيتابس', icon: '💠' },
  tap: { ar: 'تاب', icon: '🔵' },
};

/** GET — إدارة بوابات الدفع: الحالة، الإحصائيات، المعاملات */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const forbidden = requireRoles(auth, ['ADMIN', 'SUPER_ADMIN']);
  if (forbidden) return forbidden;

  const days = Math.min(365, Math.max(1, Number(req.nextUrl.searchParams.get('days') || 30)));

  const [healthResults, stats, entries] = await Promise.all([
    healthCheckAll(),
    getPaymentsSummary(days),
    prisma.accountingJournalEntry.findMany({
      where: { serialNumber: { startsWith: 'PAY-' } },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        serialNumber: true,
        date: true,
        totalDebit: true,
        descriptionAr: true,
        descriptionEn: true,
        reference: true,
        createdAt: true,
      },
    }),
  ]);

  const healthMap = healthResults;
  const providers = getAllProviders().map((provider) => ({
    ...provider,
    healthy: healthMap[provider.key] ?? false,
    envVars: PROVIDER_ENV_VARS[provider.key] || [],
  }));

  const transactions = entries.map((entry) => {
    const providerMatch = entry.descriptionAr?.match(/عبر (\S+)/);
    const provider = providerMatch ? providerMatch[1] : 'unknown';
    const label = PROVIDER_LABELS[provider] || { ar: provider, icon: '💳' };
    const tenantMatch = entry.descriptionAr?.match(/إيراد إيجار — (.+)$/);
    return {
      id: entry.serialNumber,
      date: entry.date || entry.createdAt,
      provider,
      providerName: label.ar,
      providerIcon: label.icon,
      amount: entry.totalDebit,
      tenant: tenantMatch ? tenantMatch[1] : '—',
      description: entry.descriptionAr || entry.descriptionEn || entry.reference || '—',
      status: 'PAID',
    };
  });

  return NextResponse.json(
    {
      ...getPaymentGatewayStatus(),
      providers,
      stats,
      transactions,
      webhookUrl: '/api/webhooks/payment?provider=PROVIDER_NAME',
    },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}
