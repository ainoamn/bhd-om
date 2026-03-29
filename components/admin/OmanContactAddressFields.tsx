'use client';

import { useCallback, useEffect, useRef } from 'react';
import { omanLocations } from '@/lib/data/omanLocations';
import type { ContactAddress } from '@/lib/data/addressBook';
import { getRequiredFieldClass } from '@/lib/utils/requiredFields';

export function buildContactAddressLine(parts: ContactAddress): string {
  return [parts.governorate, parts.state, parts.area, parts.village, parts.street, parts.building, parts.floor]
    .map((x) => String(x || '').trim())
    .filter(Boolean)
    .join(' — ');
}

async function translateLine(text: string, target: 'ar' | 'en'): Promise<string> {
  const t = text.trim();
  if (!t) return '';
  const res = await fetch(`/api/translate?text=${encodeURIComponent(t)}&target=${target}`);
  if (!res.ok) return '';
  const data = await res.json();
  return String(data.translatedText ?? '').trim();
}

export default function OmanContactAddressFields({
  address,
  onChange,
  locale,
  inputErrorClass = '',
  sectionClassName = '',
}: {
  address: ContactAddress;
  onChange: (next: ContactAddress) => void;
  locale: string;
  inputErrorClass?: string;
  /** إطار القسم كاملاً (مثلاً حقل إجباري مجمّع للعنوان) */
  sectionClassName?: string;
}) {
  const ar = locale === 'ar';
  const addrRef = useRef(address);
  addrRef.current = address;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const lastTouched = useRef<'ar' | 'en' | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runDebouncedTranslate = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      debounceTimer.current = null;
      const touch = lastTouched.current;
      const cur = addrRef.current;
      if (touch === 'ar') {
        const fa = (cur.fullAddress || '').trim();
        if (!fa) {
          if (cur.fullAddressEn) onChangeRef.current({ ...cur, fullAddressEn: '' });
          return;
        }
        const en = await translateLine(fa, 'en');
        if (lastTouched.current === 'ar' && en) onChangeRef.current({ ...addrRef.current, fullAddressEn: en });
      } else if (touch === 'en') {
        const fe = (cur.fullAddressEn || '').trim();
        if (!fe) {
          if (cur.fullAddress) onChangeRef.current({ ...cur, fullAddress: '' });
          return;
        }
        const arText = await translateLine(fe, 'ar');
        if (lastTouched.current === 'en' && arText) onChangeRef.current({ ...addrRef.current, fullAddress: arText });
      }
    }, 650);
  }, []);

  const pushStructured = (patch: Partial<ContactAddress>) => {
    const base = addrRef.current;
    const next: ContactAddress = { ...base, ...patch };
    if (
      patch.governorate !== undefined ||
      patch.state !== undefined ||
      patch.area !== undefined ||
      patch.village !== undefined ||
      patch.street !== undefined ||
      patch.building !== undefined ||
      patch.floor !== undefined
    ) {
      next.fullAddress = buildContactAddressLine(next);
      lastTouched.current = 'ar';
      onChangeRef.current(next);
      runDebouncedTranslate();
    } else {
      onChangeRef.current(next);
    }
  };

  const onGovernorate = (v: string) => {
    if (!v) pushStructured({ governorate: '', state: '', area: '', village: '' });
    else pushStructured({ governorate: v, state: '', area: '', village: '' });
  };

  const onState = (v: string) => {
    pushStructured({ state: v, area: '', village: '' });
  };

  const onArea = (v: string) => {
    pushStructured({ area: v });
  };

  const gov = address.governorate || '';
  const st = address.state || '';
  const govObj = omanLocations.find((g) => g.ar === gov);
  const states = govObj?.states ?? [];
  const stateObj = states.find((s) => s.ar === st);
  const villages = stateObj?.villages ?? [];

  const onFullArChange = (v: string) => {
    lastTouched.current = 'ar';
    onChangeRef.current({ ...addrRef.current, fullAddress: v });
    runDebouncedTranslate();
  };

  const onFullEnChange = (v: string) => {
    lastTouched.current = 'en';
    onChangeRef.current({ ...addrRef.current, fullAddressEn: v });
    runDebouncedTranslate();
  };

  useEffect(() => {
    const fa = (address.fullAddress || '').trim();
    const fe = (address.fullAddressEn || '').trim();
    if (fa && !fe) {
      lastTouched.current = 'ar';
      runDebouncedTranslate();
    } else if (fe && !fa) {
      lastTouched.current = 'en';
      runDebouncedTranslate();
    }
  }, [address.fullAddress, address.fullAddressEn, runDebouncedTranslate]);

  useEffect(
    () => () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    },
    []
  );

  const labelCls = 'block text-sm font-semibold text-gray-700 mb-1';

  return (
    <div className={`space-y-4 rounded-2xl border-2 border-gray-100 bg-gray-50/80 p-5 ${sectionClassName}`.trim()}>
      <h4 className="text-sm font-bold text-[#8B6F47] flex items-center gap-2 pb-2 border-b border-gray-200 m-0">
        <span className="w-8 h-8 rounded-lg bg-[#8B6F47]/10 flex items-center justify-center text-base" aria-hidden>
          📍
        </span>
        {ar ? 'العنوان (سلطنة عمان — نفس بيانات العقارات)' : 'Address (Oman — same data as properties)'}
      </h4>
      <p className="text-xs text-gray-600 m-0 -mt-1">
        {ar
          ? 'إجباري: المحافظة، الولاية، المنطقة التفصيلية. اختياري: القرية، الشارع، المبنى، الطابق.'
          : 'Required: governorate, state, detailed area. Optional: village, street, building, floor.'}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div>
          <label className={labelCls}>{ar ? 'المحافظة *' : 'Governorate *'}</label>
          <select
            value={gov}
            onChange={(e) => onGovernorate(e.target.value)}
            className={`admin-select w-full ${getRequiredFieldClass(true, gov)}`}
          >
            <option value="">{ar ? 'اختر المحافظة' : 'Select governorate'}</option>
            {omanLocations.map((g) => (
              <option key={g.ar} value={g.ar}>
                {ar ? g.ar : g.en}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>{ar ? 'الولاية / المنطقة *' : 'State / area *'}</label>
          <select
            value={st}
            onChange={(e) => onState(e.target.value)}
            className={`admin-select w-full ${getRequiredFieldClass(!!gov, st)}`}
            disabled={!gov}
          >
            <option value="">{ar ? 'اختر الولاية' : 'Select state'}</option>
            {states.map((s) => (
              <option key={s.ar} value={s.ar}>
                {ar ? s.ar : s.en}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>{ar ? 'المنطقة التفصيلية *' : 'Detailed area *'}</label>
          <select
            value={address.area || ''}
            onChange={(e) => onArea(e.target.value)}
            className={`admin-select w-full ${getRequiredFieldClass(!!st, address.area)}`}
            disabled={!st}
          >
            <option value="">{ar ? 'اختر المنطقة / القرية' : 'Select area / village'}</option>
            {villages.map((v) => (
              <option key={v.ar} value={v.ar}>
                {v.ar}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>{ar ? 'القرية / المكان (اختياري)' : 'Village / place (optional)'}</label>
          <input
            type="text"
            value={address.village ?? ''}
            onChange={(e) => pushStructured({ village: e.target.value })}
            className="admin-input w-full"
            placeholder={ar ? 'مثال: حي، شارع فرعي' : 'e.g. neighborhood'}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>{ar ? 'السكة / الشارع (اختياري)' : 'Street (optional)'}</label>
          <input
            type="text"
            value={address.street ?? ''}
            onChange={(e) => pushStructured({ street: e.target.value })}
            className="admin-input w-full"
          />
        </div>
        <div>
          <label className={labelCls}>{ar ? 'المبنى (اختياري)' : 'Building (optional)'}</label>
          <input
            type="text"
            value={address.building ?? ''}
            onChange={(e) => pushStructured({ building: e.target.value })}
            className="admin-input w-full"
          />
        </div>
        <div>
          <label className={labelCls}>{ar ? 'الطابق (اختياري)' : 'Floor (optional)'}</label>
          <input
            type="text"
            value={address.floor ?? ''}
            onChange={(e) => pushStructured({ floor: e.target.value })}
            className="admin-input w-full"
          />
        </div>
      </div>
      <div>
        <label className={labelCls}>{ar ? 'العنوان الكامل (عربي)' : 'Full address (AR)'}</label>
        <textarea
          value={address.fullAddress ?? ''}
          onChange={(e) => onFullArChange(e.target.value)}
          className={`admin-input w-full min-h-[72px] ${inputErrorClass}`}
          rows={3}
          dir="rtl"
        />
        <p className="text-xs text-gray-500 mt-1 m-0">
          {ar ? 'يُولَّد تلقائياً من الحقول أعلاه ويمكن تعديله يدوياً.' : 'Generated from the fields above; you can edit freely.'}
        </p>
      </div>
      <div>
        <label className={labelCls}>{ar ? 'العنوان الكامل (إنجليزي)' : 'Full address (EN)'}</label>
        <textarea
          value={address.fullAddressEn ?? ''}
          onChange={(e) => onFullEnChange(e.target.value)}
          className={`admin-input w-full min-h-[72px] ${inputErrorClass}`}
          rows={3}
          dir="ltr"
        />
        <p className="text-xs text-gray-500 mt-1 m-0">
          {ar ? 'يُحدَّث تلقائياً عند تعديل العربي، والعكس عند الكتابة بالإنجليزي.' : 'Updates automatically when you edit Arabic, or vice versa.'}
        </p>
      </div>
    </div>
  );
}
