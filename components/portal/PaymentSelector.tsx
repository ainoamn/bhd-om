'use client';

import { useCallback, useEffect, useState } from 'react';

/** أنواع البيانات */
interface ProviderInfo {
  key: string;
  nameAr: string;
  nameEn: string;
  icon: string;
  descriptionAr: string;
  enabled: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  description: string;
  dueId?: string;
  onSuccess?: () => void;
}

/** قائمة البوابات الافتراضية (احتياطي — تُفعَّل فقط عند ضبط المفاتيح) */
const FALLBACK_PROVIDERS: ProviderInfo[] = [
  { key: 'thawani', nameAr: 'ثواني', nameEn: 'Thawani', icon: '🇴🇲', descriptionAr: 'الدفع عبر ثواني — البطاقات المصرفية العمانية', enabled: true },
  { key: 'cmi', nameAr: 'بوابة الدفع الوطنية', nameEn: 'CMI', icon: '🏦', descriptionAr: 'البوابة الوطنية للمدفوعات — البنك المركزي العماني', enabled: false },
  { key: 'network-intl', nameAr: 'نتورك إنترناشيونال', nameEn: 'Network International', icon: '🌐', descriptionAr: 'مدفوعات آمنة — عمان والإمارات', enabled: false },
  { key: 'telr', nameAr: 'تلر', nameEn: 'Telr', icon: '🔒', descriptionAr: 'مدفوعات آمنة للمنطقة العربية', enabled: false },
  { key: 'hyperpay', nameAr: 'هايبر باي', nameEn: 'HyperPay', icon: '⚡', descriptionAr: 'Apple Pay, Google Pay, STC Pay, مدى', enabled: false },
  { key: 'payfort', nameAr: 'أمازون للمدفوعات', nameEn: 'Amazon Payment Services', icon: '📱', descriptionAr: 'مدفوعات آمنة — الإمارات والخليج', enabled: false },
  { key: 'myfatoorah', nameAr: 'فاتورتي', nameEn: 'MyFatoorah', icon: '🧾', descriptionAr: 'KNET، Apple Pay، Google Pay، Visa، Mastercard', enabled: false },
  { key: 'paytabs', nameAr: 'بيتابس', nameEn: 'PayTabs', icon: '💠', descriptionAr: 'Mada، Apple Pay، STC Pay، Visa، Mastercard', enabled: false },
  { key: 'tap', nameAr: 'تاب للمدفوعات', nameEn: 'Tap Payments', icon: '🔵', descriptionAr: 'KNET، Apple Pay، Google Pay، Visa، Mastercard', enabled: false },
  { key: 'stripe', nameAr: 'سترايب', nameEn: 'Stripe', icon: '💳', descriptionAr: 'بطاقات ائتمان عالمية (Visa, Mastercard)', enabled: false },
  { key: 'paypal', nameAr: 'باي بال', nameEn: 'PayPal', icon: '🅿️', descriptionAr: 'المدفوعات الدولية عبر PayPal', enabled: false },
];

/** ألوان البوابات */
const PROVIDER_COLORS: Record<string, string> = {
  thawani: 'from-red-600 to-red-700',
  stripe: 'from-blue-600 to-indigo-700',
  paypal: 'from-blue-800 to-blue-900',
  telr: 'from-emerald-600 to-emerald-700',
  'cmi': 'from-amber-600 to-amber-700',
  'network-intl': 'from-teal-600 to-teal-700',
  'hyperpay': 'from-purple-600 to-purple-700',
  'payfort': 'from-orange-600 to-orange-700',
  'myfatoorah': 'from-sky-600 to-sky-700',
  'paytabs': 'from-indigo-600 to-indigo-700',
  'tap': 'from-cyan-600 to-cyan-700',
};

export default function PaymentSelector({ isOpen, onClose, amount, description, dueId, onSuccess }: Props) {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'gulf' | 'oman'>('all');

  /** جلب البوابات المتاحة */
  useEffect(() => {
    if (!isOpen) return;

    async function loadProviders() {
      try {
        const res = await fetch('/api/payment/providers');
        if (res.ok) {
          const data = await res.json();
          const list = (data.providers || []) as ProviderInfo[];
          const enabled = list.filter((p) => p.enabled);
          // اعرض المفعّلة فقط؛ إن لم يوجد أي مفتاح اعرض القائمة كاملة معطّلة مع رسالة
          setProviders(enabled.length > 0 ? enabled : list.length > 0 ? list : FALLBACK_PROVIDERS);
          if (enabled.length > 0) setSelected(enabled[0].key);
          else setSelected('');
        } else {
          setProviders(FALLBACK_PROVIDERS.filter((p) => p.enabled));
          setSelected('thawani');
        }
      } catch {
        setProviders(FALLBACK_PROVIDERS.filter((p) => p.enabled));
        setSelected('thawani');
      } finally {
        setFetching(false);
      }
    }

    loadProviders();
  }, [isOpen]);

  /** إغلاق بالـ Escape */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  /** تصفية البوابات */
  const filteredProviders = providers.filter((p) => {
    if (filter === 'oman') return ['thawani', 'cmi', 'network-intl', 'telr', 'paytabs', 'tap', 'stripe', 'paypal', 'hyperpay', 'payfort', 'myfatoorah'].includes(p.key) && (p.key === 'thawani' || p.key === 'cmi' || p.key === 'network-intl');
    if (filter === 'gulf') return ['thawani', 'cmi', 'network-intl', 'telr', 'hyperpay', 'payfort', 'myfatoorah', 'paytabs', 'tap'].includes(p.key);
    return true;
  });

  /** بدء الدفع */
  const handlePay = async () => {
    if (!selected || loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: selected, amount, description, dueId }),
      });

      const data = await res.json();
      if (data.checkoutUrl) {
        onSuccess?.();
        window.location.href = data.checkoutUrl;
      } else {
        setError(data.message || data.error || 'فشل إنشاء جلسة الدفع');
      }
    } catch {
      setError('فشل الاتصال بخادم الدفع');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl" role="dialog" aria-modal="true" aria-labelledby="payment-title">
      {/* الخلفية */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* النافذة */}
      <div className="relative w-full max-w-lg max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col">
        {/* الهيدر */}
        <div className="bg-gradient-to-l from-[#1A1A2E] to-[#2d2d44] px-6 py-5 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="payment-title" className="text-xl font-bold text-white">💳 اختر طريقة الدفع</h2>
              <p className="text-white/60 text-sm mt-1">{description} — <span className="font-bold text-white">{amount.toLocaleString()} ر.ع</span></p>
            </div>
            <button onClick={onClose} className="text-white/60 hover:text-white text-2xl leading-none transition-colors" aria-label="إغلاق">✕</button>
          </div>
        </div>

        {/* فلاتر */}
        <div className="px-6 pt-4 shrink-0">
          <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
            {([
              { key: 'all' as const, label: 'الكل', count: providers.length },
              { key: 'oman' as const, label: '🇴🇲 عمان', count: providers.filter(p => ['thawani', 'cmi', 'network-intl'].includes(p.key)).length },
              { key: 'gulf' as const, label: 'الخليج', count: providers.filter(p => ['thawani', 'telr', 'hyperpay', 'payfort', 'myfatoorah', 'paytabs', 'tap', 'cmi', 'network-intl'].includes(p.key)).length },
            ]).map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-colors ${
                  filter === f.key ? 'bg-white text-[#C8102E] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {f.label} ({f.count})
              </button>
            ))}
          </div>
        </div>

        {/* قائمة البوابات */}
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">⚠️ {error}</div>
          )}

          {fetching ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border rounded-xl p-4 animate-pulse">
                  <div className="h-5 bg-gray-200 rounded w-1/3 mb-2" />
                  <div className="h-4 bg-gray-100 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2" role="radiogroup" aria-label="بوابات الدفع">
              {filteredProviders.map((provider) => (
                <button
                  key={provider.key}
                  onClick={() => setSelected(provider.key)}
                  role="radio"
                  aria-checked={selected === provider.key}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-right ${
                    selected === provider.key
                      ? 'border-[#C8102E] bg-red-50 ring-2 ring-[#C8102E]/20'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  } ${!provider.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={!provider.enabled}
                >
                  {/* أيقونة البوابة */}
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${
                    PROVIDER_COLORS[provider.key] || 'from-gray-400 to-gray-500'
                  } flex items-center justify-center text-white text-xl shadow-md shrink-0`}>
                    {provider.icon}
                  </div>

                  {/* معلومات البوابة */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-800">{provider.nameAr}</span>
                      <span className="text-gray-400 text-sm">{provider.nameEn}</span>
                      {selected === provider.key && (
                        <span className="mr-auto text-[#C8102E]">
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5 truncate">{provider.descriptionAr}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* زر الدفع */}
        <div className="p-6 border-t bg-gray-50 shrink-0">
          <button
            onClick={handlePay}
            disabled={loading || !selected || fetching}
            className="w-full py-3.5 bg-gradient-to-l from-[#C8102E] to-[#a00d24] text-white font-bold rounded-xl hover:from-[#b00e28] hover:to-[#8e0a1c] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
          >
            {loading ? (
              <>
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>جاري الاتصال بـ {providers.find((p) => p.key === selected)?.nameAr}...</span>
              </>
            ) : (
              <>
                <span>🔒</span>
                <span>دفع {amount.toLocaleString()} ر.ع — {providers.find((p) => p.key === selected)?.nameAr || 'اختر بوابة'}</span>
              </>
            )}
          </button>
          <p className="mt-3 text-center text-xs text-gray-400">🔒 جميع المعاملات مشفرة وآمنة. لا نحفظ بيانات بطاقتك.</p>
        </div>
      </div>
    </div>
  );
}
