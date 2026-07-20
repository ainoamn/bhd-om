/**
 * صفحة نجاح الدفع — بعد إكمال العملية عبر أي بوابة
 */
import Link from 'next/link';
import { verifyPayment, isValidProvider, type PaymentProvider } from '@/lib/payment/manager';
import { recordPayment } from '@/lib/payment/accounting-link';

interface Props {
  searchParams: Promise<{
    session_id?: string;
    sessionId?: string;
    provider?: string;
    token?: string;
    dueId?: string;
    userId?: string;
  }>;
}

const PROVIDER_LABELS: Record<string, string> = {
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
  tap: 'تاب',
};

export default async function PaymentSuccessPage({ searchParams }: Props) {
  const params = await searchParams;
  const sessionId = params.session_id || params.sessionId || params.token || '';
  const providerRaw = (params.provider || 'thawani').toLowerCase();
  const providerLabel = PROVIDER_LABELS[providerRaw] || providerRaw;
  let journalSerial: string | null = null;

  if (sessionId && isValidProvider(providerRaw)) {
    try {
      const provider = providerRaw as PaymentProvider;
      const verification = await verifyPayment(provider, sessionId);
      if (verification.paid) {
        const result = await recordPayment({
          provider,
          sessionId,
          reference: verification.reference,
          amount: verification.amount,
          customerEmail: 'portal@bhd-om.com',
          description: 'دفع إيجار — بوابة المستأجر',
          userId: params.userId || undefined,
          dueId: params.dueId || undefined,
          paidAt: new Date(),
        });
        if (result.success && result.serialNumber) {
          journalSerial = result.serialNumber;
        }
      }
    } catch (error) {
      console.error('[PaymentSuccess] Accounting link failed:', error);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
      <meta httpEquiv="refresh" content="5;url=/ar/portal/tenant/v2" />

      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg overflow-hidden text-center">
        <div className="bg-gradient-to-l from-[#C8102E] to-[#a00d24] py-6">
          <div className="w-20 h-20 mx-auto bg-white rounded-full flex items-center justify-center text-5xl shadow-md">
            ✅
          </div>
        </div>

        <div className="p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">تم الدفع بنجاح!</h1>
          <p className="text-gray-500 mb-6">
            شكراً لك. تمت المعالجة عبر {providerLabel}.
          </p>

          {journalSerial && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-right">
              <p className="text-sm text-green-700">تم تسجيل القيد المحاسبي:</p>
              <p className="font-mono text-sm text-green-900" dir="ltr">
                {journalSerial}
              </p>
            </div>
          )}

          {sessionId && (
            <div className="bg-gray-50 border rounded-lg p-4 mb-6 text-right">
              <p className="text-sm text-gray-500">رقم الجلسة:</p>
              <p className="font-mono text-sm text-gray-700 break-all" dir="ltr">
                {sessionId}
              </p>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 text-sm text-gray-400 mb-6">
            <span>سيتم تحويلك تلقائياً خلال 5 ثوانٍ...</span>
          </div>

          <Link
            href="/ar/portal/tenant/v2"
            prefetch
            className="inline-block w-full px-6 py-3 bg-[#C8102E] text-white font-bold rounded-lg hover:bg-[#a00d24] transition-colors"
          >
            العودة إلى لوحة التحكم →
          </Link>
        </div>
      </div>
    </main>
  );
}
