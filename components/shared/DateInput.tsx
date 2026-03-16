'use client';

import { useState, useRef, useEffect } from 'react';

/** تحويل yyyy-mm-dd إلى dd-mm-yyyy للعرض */
function toDisplay(iso: string): string {
  if (!iso || iso.length < 10) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return d && m && y ? `${d}-${m}-${y}` : iso;
}

/** تحويل dd-mm-yyyy إلى yyyy-mm-dd للقيمة */
function toValue(display: string): string {
  const cleaned = display.replace(/\s/g, '').replace(/[/.]/g, '-');
  const parts = cleaned.split('-').filter(Boolean);
  if (parts.length === 3) {
    const [a, b, c] = parts;
    const d = a.length <= 2 ? a : c;
    const m = b.length <= 2 ? b : b;
    const y = (a.length === 4 ? a : c) as string;
    if (d.length <= 2 && m.length <= 2 && y.length === 4) {
      const day = parseInt(d, 10);
      const month = parseInt(m, 10);
      const year = parseInt(y, 10);
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
        const mm = String(month).padStart(2, '0');
        const dd = String(day).padStart(2, '0');
        return `${year}-${mm}-${dd}`;
      }
    }
  }
  return '';
}

const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS_AR = ['ح', 'ن', 'ث', 'ر', 'م', 'خ', 'ج'];
const DAYS_EN = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export interface DateInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  /** لون النص والخلفية (مثلاً للوحة الداكنة) */
  dark?: boolean;
  /** لغة الواجهة */
  locale?: string;
  min?: string;
  max?: string;
}

export default function DateInput({
  value,
  onChange,
  placeholder,
  className = '',
  required,
  disabled,
  id,
  dark = false,
  locale = 'ar',
  min,
  max,
  onBlur: onBlurProp,
}: DateInputProps) {
  const ar = locale === 'ar';
  const [display, setDisplay] = useState(() => toDisplay(value));
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => {
    if (value && value.length >= 10) {
      const [y, m] = value.split('-');
      return { year: parseInt(y, 10), month: parseInt(m, 10) - 1 };
    }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDisplay(toDisplay(value));
    if (value && value.length >= 10) {
      const [y, m] = value.split('-');
      setViewMonth({ year: parseInt(y, 10), month: parseInt(m, 10) - 1 });
    }
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [open]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setDisplay(v);
    const parsed = toValue(v);
    if (parsed) onChange(parsed);
  };

  const handleBlur = () => {
    const parsed = toValue(display);
    if (parsed) {
      onChange(parsed);
      setDisplay(toDisplay(parsed));
    } else if (!display.trim()) {
      onChange('');
    }
    onBlurProp?.();
  };

  const handleDaySelect = (year: number, month: number, day: number) => {
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(iso);
    setDisplay(toDisplay(iso));
    setOpen(false);
  };

  const firstDay = new Date(viewMonth.year, viewMonth.month, 1).getDay();
  const daysInMonth = new Date(viewMonth.year, viewMonth.month + 1, 0).getDate();
  const startOffset = ar ? (firstDay + 6) % 7 : firstDay;
  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) week.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  const months = ar ? MONTHS_AR : MONTHS_EN;
  const daysHeader = ar ? DAYS_AR : DAYS_EN;

  const prevMonth = () => {
    if (viewMonth.month === 0) setViewMonth({ year: viewMonth.year - 1, month: 11 });
    else setViewMonth({ year: viewMonth.year, month: viewMonth.month - 1 });
  };
  const nextMonth = () => {
    if (viewMonth.month === 11) setViewMonth({ year: viewMonth.year + 1, month: 0 });
    else setViewMonth({ year: viewMonth.year, month: viewMonth.month + 1 });
  };

  const place = placeholder ?? (ar ? 'يوم-شهر-سنة (dd-mm-yyyy)' : 'dd-mm-yyyy');
  const inputClass = dark
    ? 'bg-white/5 border-white/10 text-white placeholder:text-white/50 focus:border-[#8B6F47] focus:ring-[#8B6F47]/30'
    : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-[#8B6F47] focus:ring-[#8B6F47]/20';

  return (
    <div ref={containerRef} className="relative inline-block w-full">
      <div className="flex gap-1">
        <input
          type="text"
          inputMode="numeric"
          id={id}
          value={display}
          onChange={handleInputChange}
          onBlur={handleBlur}
          placeholder={place}
          required={required}
          disabled={disabled}
          className={`flex-1 min-w-0 px-4 py-2.5 rounded-xl border-2 outline-none focus:ring-2 ${inputClass} ${className}`}
          dir="ltr"
          maxLength={14}
        />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          disabled={disabled}
          className={`shrink-0 flex items-center justify-center w-11 h-[42px] rounded-xl border-2 outline-none focus:ring-2 focus:ring-[#8B6F47]/30 ${dark ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'}`}
          title={ar ? 'فتح التقويم' : 'Open calendar'}
          aria-label={ar ? 'التقويم' : 'Calendar'}
        >
          <span className="text-lg" aria-hidden>📅</span>
        </button>
      </div>
      {open && (
        <div
          className={`absolute z-50 mt-1 rounded-2xl border-2 shadow-xl overflow-hidden ${dark ? 'bg-gray-900 border-white/20' : 'bg-white border-gray-200'}`}
          style={{ [ar ? 'right' : 'left']: 0, minWidth: '280px' }}
        >
          <div className={`flex items-center justify-between px-3 py-2 border-b ${dark ? 'border-white/10' : 'border-gray-100'}`}>
            <button type="button" onClick={prevMonth} className={`p-2 rounded-lg hover:bg-black/10 ${dark ? 'text-white' : 'text-gray-700'}`} aria-label={ar ? 'الشهر السابق' : 'Previous month'}>‹</button>
            <span className={`font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>
              {months[viewMonth.month]} {viewMonth.year}
            </span>
            <button type="button" onClick={nextMonth} className={`p-2 rounded-lg hover:bg-black/10 ${dark ? 'text-white' : 'text-gray-700'}`} aria-label={ar ? 'الشهر التالي' : 'Next month'}>›</button>
          </div>
          <div className="p-2">
            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {daysHeader.map((d, i) => (
                <div key={i} className={`text-center text-xs font-medium py-1 ${dark ? 'text-white/70' : 'text-gray-500'}`}>{d}</div>
              ))}
            </div>
            {weeks.map((row, wi) => (
              <div key={wi} className="grid grid-cols-7 gap-0.5">
                {row.map((d, di) => {
                  if (d === null) return <div key={di} />;
                  const iso = `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                  const isSelected = value && value.slice(0, 10) === iso;
                  const isMin = Boolean(min && iso < min.slice(0, 10));
                  const isMax = Boolean(max && iso > max.slice(0, 10));
                  const disabledDay = isMin || isMax;
                  return (
                    <button
                      key={di}
                      type="button"
                      onClick={() => !disabledDay && handleDaySelect(viewMonth.year, viewMonth.month, d)}
                      disabled={!!disabledDay}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${disabledDay ? (dark ? 'text-white/30' : 'text-gray-300') : isSelected ? 'bg-[#8B6F47] text-white' : dark ? 'text-white hover:bg-white/20' : 'text-gray-800 hover:bg-gray-100'}`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
