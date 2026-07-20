'use client';

import { useCallback, useEffect, useState } from 'react';

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

const FALLBACK_PROVIDERS: ProviderInfo[] = [
  {
    key: 'thawani',
    nameAr: 'ثواني',
    nameEn: 'Thawani',
    icon: '🇴🇲',
    descriptionAr: 'الدفع عبر ثواني — البطاقات المصرفية العمانية',
    enabled: true,
  },
  {
    key: 'stripe',
    nameAr: 'سترايب',
    nameEn: 'Stripe',
    icon: '💳',
    descriptionAr: 'بطاقات ائتمان عالمية (Visa, Mastercard)',
    enabled: false,
  },
  {
    key: 'paypal',
    nameAr: 'باي بال',
    nameEn: 'PayPal',
    icon: '🅿️',
    descriptionAr: 'المدفوعات الدولية عبر PayPal',
    enabled: false,
  },
  {
    key: 'telr',
    nameAr: 'تلر',
    nameEn: 'Telr',
    icon: '🔒',
    descriptionAr: 'مدفوعات آمنة للمنطقة العربية',
    enabled: false,
  },
];

const PROVIDER_COLORS: Record<string, string> = {
  thawani: 'from-red-600 to-red-700',
  stripe: 'from-blue-600 to-indigo-700',
  paypal: 'from-blue-800 to-blue-900',
  telr: 'from-emerald-600 to-emerald-700',
};

export default function PaymentSelector({
  isOpen,
  onClose,
  amount,
  description,
  dueId,
  onSuccess,
}: Props) {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    async function loadProviders() {
      setFetching(true);
      setError(null);
      try {
        const res = await fetch('/api/payment/providers');
        if (res.ok) {
          const data = await res.json();
          const list: ProviderInfo[] = data.providers || [];
          const enabled = list.filter((p) => p.enabled);
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

    void loadProviders();
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
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

  const handlePay = async () => {
    if (!selected || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selected,
          amount,
          description,
          dueId,
        }),
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

  const enabledProviders = providers.filter((p) => p.enabled);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-title"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-l from-[#1A1A2E] to-[#2d2d44] px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="payment-title" className="text-xl font-bold text-white">
                اختر طريقة الدفع
              </h2>
              <p className="text-white/60 text-sm mt-1">
                {description} —{' '}
                <span className="font-bold text-white">{amount.toLocaleString()} ر.ع</span>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-white/60 hover:text-white text-2xl leading-none"
              aria-label="إغلاق"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
              {error}
            </div>
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
          ) : enabledProviders.length === 0 ? (
            <p className="text-center text-gray-500 py-6">
              لا توجد بوابة دفع مفعّلة حالياً. تواصل مع الإدارة.
            </p>
          ) : (
            <div className="space-y-3" role="radiogroup" aria-label="بوابات الدفع">
              {enabledProviders.map((provider) => (
                <button
                  key={provider.key}
                  type="button"
                  onClick={() => setSelected(provider.key)}
                  role="radio"
                  aria-checked={selected === provider.key}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-right ${
                    selected === provider.key
                      ? 'border-[#C8102E] bg-red-50 ring-2 ring-[#C8102E]/20'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-lg bg-gradient-to-br ${
                      PROVIDER_COLORS[provider.key] || 'from-gray-400 to-gray-500'
                    } flex items-center justify-center text-white text-xl shadow-md shrink-0`}
                  >
                    {provider.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-800">{provider.nameAr}</span>
                      <span className="text-gray-400 text-sm">{provider.nameEn}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5 truncate">{provider.descriptionAr}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => void handlePay()}
            disabled={loading || !selected || fetching || enabledProviders.length === 0}
            className="mt-6 w-full py-3.5 bg-gradient-to-l from-[#C8102E] to-[#a00d24] text-white font-bold rounded-xl hover:from-[#b00e28] hover:to-[#8e0a1c] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
          >
            {loading ? (
              <span>
                جاري الاتصال بـ {providers.find((p) => p.key === selected)?.nameAr}...
              </span>
            ) : (
              <span>
                دفع {amount.toLocaleString()} ر.ع —{' '}
                {providers.find((p) => p.key === selected)?.nameAr || ''}
              </span>
            )}
          </button>

          <p className="mt-3 text-center text-xs text-gray-400">
            جميع المعاملات مشفرة وآمنة. لا نحفظ بيانات بطاقتك.
          </p>
        </div>
      </div>
    </div>
  );
}
