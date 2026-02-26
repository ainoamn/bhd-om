'use client';

import { useState } from 'react';

interface TranslateFieldProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  rows?: number;
  multiline?: boolean;
  required?: boolean;
  locale?: string;
  /** Text to translate FROM (the other language) */
  sourceValue?: string;
  /** Called with translated result - parent updates the appropriate field */
  onTranslateFromSource?: (translatedText: string) => void;
  /** Label for translate button: 'fromAr' = ترجمة من العربي, 'fromEn' = ترجمة من الإنجليزي */
  translateFrom?: 'ar' | 'en';
  /** 'dark' for client-facing dark theme (contract-terms) */
  variant?: 'default' | 'dark';
  /** Optional extra class for input (e.g. error border) */
  inputErrorClass?: string;
  onBlur?: () => void;
  onFocus?: () => void;
}

export default function TranslateField({
  value,
  onChange,
  label,
  placeholder,
  rows = 4,
  multiline = false,
  required = false,
  locale = 'ar',
  sourceValue = '',
  onTranslateFromSource,
  translateFrom = 'en',
  variant = 'default',
  inputErrorClass = '',
  onBlur,
  onFocus,
}: TranslateFieldProps) {
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ar = locale === 'ar';
  const hasSource = sourceValue?.trim().length > 0;

  const handleTranslate = async () => {
    if (!hasSource || !onTranslateFromSource) return;
    setTranslating(true);
    setError(null);
    try {
      const target = translateFrom === 'ar' ? 'en' : 'ar';
      const res = await fetch(`/api/translate?text=${encodeURIComponent(sourceValue)}&target=${target}`);
      const data = await res.json();
      if (data.translatedText) {
        onTranslateFromSource(data.translatedText);
      } else {
        setError(ar ? 'فشلت الترجمة' : 'Translation failed');
      }
    } catch {
      setError(ar ? 'فشلت الترجمة' : 'Translation failed');
    } finally {
      setTranslating(false);
    }
  };

  const isDark = variant === 'dark';
  const baseInputClass = isDark
    ? 'w-full px-5 py-3.5 rounded-xl border border-white/20 bg-white/5 text-white placeholder:text-white focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47] outline-none'
    : 'admin-input w-full';
  const InputComponent = multiline ? 'textarea' : 'input';
  const inputProps = multiline
    ? { rows, className: `${baseInputClass} ${isDark ? 'min-h-[80px]' : 'min-h-[120px]'} ${inputErrorClass}` }
    : { type: 'text', className: `${baseInputClass} ${inputErrorClass}` };

  const btnLabel = translateFrom === 'ar'
    ? (ar ? 'ترجمة من العربي' : 'Translate from Arabic')
    : (ar ? 'ترجمة من الإنجليزي' : 'Translate from English');

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className={isDark ? 'block text-sm font-semibold text-white mb-2' : 'admin-input-label'}>{label} {required && '*'}</label>
        {onTranslateFromSource && (
          <button
            type="button"
            onClick={handleTranslate}
            disabled={translating || !hasSource}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? 'bg-[#8B6F47]/30 text-white hover:bg-[#8B6F47]/50' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}
            title={btnLabel}
          >
            {translating ? (
              <span className="animate-pulse">{ar ? 'جاري...' : 'Translating...'}</span>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
                {btnLabel}
              </>
            )}
          </button>
        )}
      </div>
      <InputComponent
        {...inputProps}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        onFocus={onFocus}
        placeholder={placeholder}
        required={required}
      />
      {error && <p className={`text-sm ${isDark ? 'text-white' : 'text-red-500'}`}>{error}</p>}
    </div>
  );
}
