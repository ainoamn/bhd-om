/**
 * صفحة نجاح الدفع — بعد إكمال العملية عبر أي بوابة
 */
import Link from 'next/link';

interface Props {
  searchParams: Promise<{
    session_id?: string;
    sessionId?: string;
    provider?: string;
    token?: string;
  }>;
}

const PROVIDER_LABELS: Record<string, string> = {
  thawani: 'ثواني',
  stripe: 'سترايب',
  paypal: 'باي بال',
  telr: 'تلر',
};

export default async function PaymentSuccessPage({ searchParams }: Props) {
  const params = await searchParams;
  const sessionId = params.session_id || params.sessionId || params.token || '';
  const provider = (params.provider || 'thawani').toLowerCase();
  const providerLabel = PROVIDER_LABELS[provider] || provider;

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
