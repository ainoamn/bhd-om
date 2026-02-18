'use client';

import { useState, useRef, useEffect } from 'react';
import { COUNTRY_DIAL_CODES, searchCountryDialCodes, type CountryDialCode } from '@/lib/data/countryDialCodes';

interface PhoneCountryCodeSelectProps {
  value: string;
  onChange: (code: string) => void;
  locale?: 'ar' | 'en';
  className?: string;
  selectClassName?: string;
  /** حجم صغير للمفوضين */
  size?: 'default' | 'sm';
  /** واجهة داكنة لصفحات العملاء */
  variant?: 'default' | 'dark';
  onBlur?: () => void;
}

export default function PhoneCountryCodeSelect({
  value,
  onChange,
  locale = 'ar',
  className = '',
  selectClassName = '',
  size = 'default',
  variant = 'default',
  onBlur,
}: PhoneCountryCodeSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const nameKey = locale === 'ar' ? 'nameAr' : 'nameEn';
  const filtered = search ? searchCountryDialCodes(search, locale) : COUNTRY_DIAL_CODES;
  const selected = COUNTRY_DIAL_CODES.find((c) => c.code === value) || COUNTRY_DIAL_CODES.find((c) => c.code === '968');

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        onBlur?.();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onBlur]);

  const inputClass = size === 'sm'
    ? 'px-2 py-2 text-sm rounded-lg'
    : 'px-3 py-3.5 rounded-xl';
  const listMaxH = size === 'sm' ? 'max-h-48' : 'max-h-64';
  const isDark = variant === 'dark';
  const btnClass = isDark
    ? 'bg-white/5 border-white/10 text-white focus:ring-[#8B6F47]'
    : 'bg-white border-gray-300 text-gray-800 focus:ring-[#8B6F47]';

  return (
    <div ref={containerRef} className={`relative shrink-0 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full min-w-[100px] flex items-center justify-between gap-1 border focus:ring-2 focus:border-[#8B6F47] outline-none ${inputClass} ${btnClass} ${selectClassName}`}
      >
        <span className="truncate">+{selected?.code || value || '968'}</span>
        <span className={`text-xs truncate max-w-[70px] ${isDark ? 'text-white/70' : 'text-gray-500'}`}>({((selected as CountryDialCode)?.[nameKey] || '').slice(0, 10)}{((selected as CountryDialCode)?.[nameKey] || '').length > 10 ? '…' : ''})</span>
        <span className={isDark ? 'text-white/50' : 'text-gray-400'}>▼</span>
      </button>
      {open && (
        <div className={`absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg ${listMaxH} overflow-hidden flex flex-col min-w-[220px]`}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={locale === 'ar' ? 'بحث بالدولة أو الرقم...' : 'Search by country or code...'}
            className="px-3 py-2 border-b border-gray-200 text-sm focus:outline-none focus:ring-0"
            autoFocus
          />
          <div className={`overflow-y-auto ${listMaxH}`}>
            {filtered.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => {
                  onChange(c.code);
                  setOpen(false);
                  setSearch('');
                  onBlur?.();
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-amber-50 flex justify-between gap-2 ${c.code === value ? 'bg-amber-50 text-[#8B6F47] font-medium' : ''}`}
              >
                <span className="truncate">{(c as CountryDialCode)[nameKey]}</span>
                <span className="text-gray-500 shrink-0">+{c.code}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-4 text-sm text-gray-500">{locale === 'ar' ? 'لا توجد نتائج' : 'No results'}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
