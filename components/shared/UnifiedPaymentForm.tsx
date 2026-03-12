'use client';

/**
 * شاشة دفع موحّدة في كل أنحاء الموقع — نفس تصميم وتنسيق صفحة حجز العقار.
 * Unified payment screen: same design and layout as property booking payment.
 */

import type { ReactNode } from 'react';

export type CardData = {
  number: string;
  expiry: string;
  cvv: string;
  name: string;
};

function formatCardNumber(v: string): string {
  const digits = v.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

function formatExpiry(v: string): string {
  const digits = v.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

export type UnifiedPaymentFormProps = {
  locale: string;
  /** المبلغ المعروض للمستخدم */
  amount: number;
  /** عملة (مثلاً OMR) */
  currency?: string;
  cardData: CardData;
  onCardDataChange: (data: CardData) => void;
  /** عند النقر على الدفع */
  onSubmit: () => void;
  /** عند الإلغاء */
  onCancel: () => void;
  /** نص زر الدفع */
  submitLabel: string;
  /** نص زر الإلغاء */
  cancelLabel?: string;
  /** جاري المعالجة */
  loading?: boolean;
  /** تعطيل الزر */
  disabled?: boolean;
  /** عند الاستخدام داخل <form>، مرّر id النموذج ليكون الزر type="submit" form={formId} */
  formId?: string;
  /** عرض خانة الموافقة على الشروط */
  showTerms?: boolean;
  termsAccepted?: boolean;
  onTermsChange?: (accepted: boolean) => void;
  /** نص الشروط (اختياري) */
  termsLabel?: string;
  /** عرض شارة "محاكاة" */
  showSimulationBadge?: boolean;
  /** عنوان اختياري فوق قسم الدفع */
  title?: string;
  /** محتوى إضافي تحت المبلغ (مثلاً "سيُطبّق بعد انتهاء الفترة") */
  amountNote?: ReactNode;
  /** استعمال داخل modal (تقليل الهوامش قليلاً) */
  compact?: boolean;
};

const PAYMENT_FORM_CLASSES = {
  wrapper: 'relative',
  badge: 'text-[10px] font-bold px-2.5 py-1 rounded-lg bg-amber-500/30 text-amber-300 border border-amber-400/30',
  cardBox: 'rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] p-6 md:p-8',
  cardPreview: 'relative aspect-[1.586/1] rounded-2xl overflow-hidden transform transition-transform duration-300 hover:scale-[1.02]',
  input: 'w-full px-5 py-4 rounded-xl bg-white/5 border border-white/10 text-white font-mono placeholder-white focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47] transition-all',
  inputText: 'w-full px-5 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47] transition-all',
  label: 'block text-sm font-semibold text-white opacity-100 mb-2',
  amount: 'text-2xl font-bold text-[#C9A961]',
  amountSmall: 'text-sm font-medium text-white',
  btnCancel: 'px-8 py-4 rounded-xl font-bold text-white hover:text-white border border-white/20 hover:border-white/40 hover:bg-white/5 text-center transition-all',
  btnSubmit: 'flex-1 relative px-8 py-5 rounded-xl font-bold text-lg bg-gradient-to-r from-[#8B6F47] to-[#A6895F] text-white hover:from-[#6B5535] hover:to-[#8B6F47] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl shadow-[#8B6F47]/20 hover:shadow-[#8B6F47]/30 overflow-hidden group',
};

export default function UnifiedPaymentForm({
  locale,
  amount,
  currency = 'OMR',
  cardData,
  onCardDataChange,
  onSubmit,
  onCancel,
  submitLabel,
  cancelLabel,
  loading = false,
  disabled = false,
  formId,
  showTerms = false,
  termsAccepted = false,
  onTermsChange,
  termsLabel,
  showSimulationBadge = true,
  title,
  amountNote,
  compact = false,
}: UnifiedPaymentFormProps) {
  const ar = locale === 'ar';
  const displayCardNumber = cardData.number || '•••• •••• •••• ••••';
  const displayCardName = cardData.name || (ar ? 'اسم حامل البطاقة' : 'CARDHOLDER NAME');
  const displayCardExpiry = cardData.expiry || 'MM/YY';

  const padding = compact ? 'p-4 md:p-6' : 'p-6 md:p-8';

  return (
    <div className={PAYMENT_FORM_CLASSES.wrapper}>
      {showSimulationBadge && (
        <div className="absolute top-3 end-3">
          <span className={PAYMENT_FORM_CLASSES.badge}>{ar ? 'محاكاة' : 'Simulation'}</span>
        </div>
      )}
      <div className={`${PAYMENT_FORM_CLASSES.cardBox} ${padding}`}>
        {title && (
          <h3 className="text-lg font-bold text-white mb-4">{title}</h3>
        )}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* 3D Card Preview */}
          <div className="lg:w-80 flex-shrink-0">
            <div
              className={PAYMENT_FORM_CLASSES.cardPreview}
              style={{
                background: 'linear-gradient(135deg, #1a1f36 0%, #2d3548 50%, #1a1f36 100%)',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
              }}
            >
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(201,169,97,0.15)_0%,_transparent_50%)]" />
              <div className="absolute top-6 start-6 end-6 flex justify-between">
                <div className="w-12 h-8 rounded bg-white/20" />
                <span className="text-white font-mono text-sm tracking-widest">VISA</span>
              </div>
              <div className="absolute bottom-6 start-6 end-6">
                <p className="font-mono text-white text-lg tracking-[0.2em] mb-2">{displayCardNumber}</p>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] text-white uppercase tracking-wider mb-0.5">{ar ? 'الاسم' : 'NAME'}</p>
                    <p className="text-white text-sm font-medium uppercase truncate max-w-[140px]">{displayCardName}</p>
                  </div>
                  <div className="text-end">
                    <p className="text-[10px] text-white uppercase tracking-wider mb-0.5">{ar ? 'انتهاء' : 'EXPIRES'}</p>
                    <p className="text-white text-sm font-mono">{displayCardExpiry}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card Inputs */}
          <div className="flex-1 space-y-5">
            <div>
              <label className={PAYMENT_FORM_CLASSES.label}>{ar ? 'رقم البطاقة' : 'Card Number'}</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={19}
                value={cardData.number}
                onChange={(e) => onCardDataChange({ ...cardData, number: formatCardNumber(e.target.value) })}
                placeholder="1234 5678 9012 3456"
                className={PAYMENT_FORM_CLASSES.input}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={PAYMENT_FORM_CLASSES.label}>{ar ? 'انتهاء (شهر/سنة)' : 'Expiry (MM/YY)'}</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={5}
                  value={cardData.expiry}
                  onChange={(e) => onCardDataChange({ ...cardData, expiry: formatExpiry(e.target.value) })}
                  placeholder="MM/YY"
                  className={PAYMENT_FORM_CLASSES.input}
                />
              </div>
              <div>
                <label className={PAYMENT_FORM_CLASSES.label}>CVV</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={cardData.cvv}
                  onChange={(e) => onCardDataChange({ ...cardData, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                  placeholder="123"
                  className={PAYMENT_FORM_CLASSES.input}
                />
              </div>
            </div>
            <div>
              <label className={PAYMENT_FORM_CLASSES.label}>{ar ? 'اسم حامل البطاقة' : 'Cardholder Name'}</label>
              <input
                type="text"
                value={cardData.name}
                onChange={(e) => onCardDataChange({ ...cardData, name: e.target.value })}
                placeholder={ar ? 'الاسم كما يظهر على البطاقة' : 'Name as on card'}
                className={PAYMENT_FORM_CLASSES.inputText}
              />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <span className={PAYMENT_FORM_CLASSES.amount}>
                {amount.toLocaleString('en-US')} <span className={PAYMENT_FORM_CLASSES.amountSmall}>{currency === 'OMR' ? (ar ? 'ر.ع' : 'OMR') : currency}</span>
              </span>
              <span className="text-white text-sm">—</span>
              <span className="text-white text-sm">{ar ? 'مبلغ الدفع' : 'Payment amount'}</span>
            </div>
            {amountNote && <div className="text-white/80 text-sm">{amountNote}</div>}
          </div>
        </div>

        {showTerms && onTermsChange && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-6 pt-6 border-t border-white/10">
            <label className="flex items-start gap-4 cursor-pointer group">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => onTermsChange(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-white/30 bg-white/5 text-[#8B6F47] focus:ring-[#8B6F47] focus:ring-offset-0 focus:ring-offset-transparent"
              />
              <span className="text-white group-hover:text-white text-sm">{termsLabel || (ar ? 'أوافق على الشروط المذكورة أعلاه.' : 'I agree to the terms stated above.')}</span>
            </label>
            <div className="flex items-center gap-4 text-white text-xs">
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a3 3 0 013 3v1a3 3 0 01-6 0v-1a3 3 0 013-3z" clipRule="evenodd" /></svg>
                {ar ? 'اتصال آمن' : 'Secure'}
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                SSL
              </span>
            </div>
          </div>
        )}

        {/* CTA Buttons */}
        <div className="flex flex-col-reverse sm:flex-row gap-4 pt-4 mt-6 border-t border-white/10">
          <button type="button" onClick={onCancel} className={PAYMENT_FORM_CLASSES.btnCancel}>
            {cancelLabel ?? (ar ? 'إلغاء' : 'Cancel')}
          </button>
          {formId ? (
            <button
              type="submit"
              form={formId}
              disabled={disabled || loading}
              className={PAYMENT_FORM_CLASSES.btnSubmit}
            >
              {loading && (
                <span className="absolute inset-0 bg-white/10 flex items-center justify-center">
                  <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </span>
              )}
              <span className={loading ? 'invisible' : ''}>{submitLabel}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onSubmit}
              disabled={disabled || loading}
              className={PAYMENT_FORM_CLASSES.btnSubmit}
            >
              {loading && (
                <span className="absolute inset-0 bg-white/10 flex items-center justify-center">
                  <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </span>
              )}
              <span className={loading ? 'invisible' : ''}>{submitLabel}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
