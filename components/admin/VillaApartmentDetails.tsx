'use client';

import { useState } from 'react';
import {
  ROOM_COUNT_OPTIONS,
  BATHROOM_COUNT_OPTIONS,
  FURNISHED_OPTIONS,
  FLOOR_COUNT_OPTIONS,
  BUILDING_AGE_OPTIONS,
  ADVERTISER_OPTIONS,
  MAIN_FEATURES,
  ADDITIONAL_FEATURES,
  NEARBY_LOCATIONS,
  FACING_OPTIONS,
} from '@/lib/propertyOptions';

export interface VillaApartmentFormData {
  roomCount: string;
  bathroomCount: string;
  furnished: string;
  buildingArea: string;
  landArea: string;
  floorCount: string;
  buildingAge: string;
  advertiser: string;
  brokerName: string;
  brokerPhone: string;
  mainFeatures: string[];
  additionalFeatures: string[];
  customMainFeatures: string[];
  customAdditionalFeatures: string[];
  nearbyLocations: string[];
  isMortgaged: string;
  facing: string;
}

export const emptyVillaApartment: VillaApartmentFormData = {
  roomCount: '',
  bathroomCount: '',
  furnished: '',
  buildingArea: '',
  landArea: '',
  floorCount: '',
  buildingAge: '',
  advertiser: '',
  brokerName: '',
  brokerPhone: '',
  mainFeatures: [],
  additionalFeatures: [],
  customMainFeatures: [],
  customAdditionalFeatures: [],
  nearbyLocations: [],
  isMortgaged: '',
  facing: '',
};

interface VillaApartmentDetailsProps {
  data: VillaApartmentFormData;
  onChange: (data: VillaApartmentFormData) => void;
  locale: string;
  /** إخفاء حقل عدد الطوابق (للمزارع والشاليهات) */
  hideFloorCount?: boolean;
}

const VISIBLE_COUNT = 5;

function ExpandableFeaturesGroup({
  options,
  selected,
  customItems,
  onChange,
  onCustomChange,
  ar,
  label,
}: {
  options: { key: string; ar: string; en: string }[];
  selected: string[];
  customItems: string[];
  onChange: (keys: string[]) => void;
  onCustomChange: (items: string[]) => void;
  ar: boolean;
  label: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [customInput, setCustomInput] = useState('');

  const visibleOptions = expanded ? options : options.slice(0, VISIBLE_COUNT);
  const hasMore = options.length > VISIBLE_COUNT;

  const toggle = (key: string) => {
    if (selected.includes(key)) {
      onChange(selected.filter((k) => k !== key));
    } else {
      onChange([...selected, key]);
    }
  };

  const addCustom = () => {
    const trimmed = customInput.trim();
    if (trimmed && !customItems.includes(trimmed)) {
      onCustomChange([...customItems, trimmed]);
      setCustomInput('');
    }
  };

  const removeCustom = (item: string) => {
    onCustomChange(customItems.filter((i) => i !== item));
  };

  return (
    <div className="space-y-3">
      <label className="admin-input-label block">{label}</label>
      <div className="flex flex-wrap gap-2">
        {visibleOptions.map((opt) => (
          <label key={opt.key} className="inline-flex items-center gap-2 cursor-pointer py-2 min-h-[44px] touch-manipulation">
            <input
              type="checkbox"
              checked={selected.includes(opt.key)}
              onChange={() => toggle(opt.key)}
              className="rounded border-gray-300 text-primary focus:ring-primary w-5 h-5 flex-shrink-0"
            />
            <span className="text-sm">{ar ? opt.ar : opt.en}</span>
          </label>
        ))}
      </div>
      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-primary hover:underline font-medium"
        >
          {expanded ? (ar ? 'عرض أقل' : 'Show less') : (ar ? 'عرض المزيد' : 'Show more')} ({options.length - VISIBLE_COUNT})
        </button>
      )}
      {customItems.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {customItems.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary text-sm"
            >
              {item}
              <button type="button" onClick={() => removeCustom(item)} className="hover:text-red-600" aria-label={ar ? 'حذف' : 'Remove'}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2 mt-2">
        <input
          type="text"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustom())}
          placeholder={ar ? 'أضف ميزة بالكتابة...' : 'Add custom feature...'}
          className="admin-input flex-1 py-2 text-sm"
        />
        <button type="button" onClick={addCustom} className="admin-btn-secondary text-sm py-2">
          {ar ? 'إضافة' : 'Add'}
        </button>
      </div>
    </div>
  );
}

function CheckboxGroup({
  options,
  selected,
  onChange,
  ar,
}: {
  options: { key: string; ar: string; en: string }[];
  selected: string[];
  onChange: (keys: string[]) => void;
  ar: boolean;
}) {
  const toggle = (key: string) => {
    if (selected.includes(key)) {
      onChange(selected.filter((k) => k !== key));
    } else {
      onChange([...selected, key]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <label key={opt.key} className="inline-flex items-center gap-2 cursor-pointer py-2 min-h-[44px] touch-manipulation">
          <input
            type="checkbox"
            checked={selected.includes(opt.key)}
            onChange={() => toggle(opt.key)}
            className="rounded border-gray-300 text-primary focus:ring-primary w-5 h-5 flex-shrink-0"
          />
          <span className="text-sm">{ar ? opt.ar : opt.en}</span>
        </label>
      ))}
    </div>
  );
}

export default function VillaApartmentDetails({ data, onChange, locale, hideFloorCount }: VillaApartmentDetailsProps) {
  const ar = locale === 'ar';

  const update = (partial: Partial<VillaApartmentFormData>) => {
    onChange({ ...data, ...partial });
  };

  return (
    <div className="space-y-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
        {ar ? 'تفاصيل إضافية للعقار' : 'Additional Property Details'}
      </h3>

      {/* 1. المعلن - Advertiser */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="admin-input-label">{ar ? 'المعلن' : 'Advertiser'}</label>
          <select value={data.advertiser} onChange={(e) => update({ advertiser: e.target.value })} className="admin-select w-full">
            <option value="">{ar ? 'اختر' : 'Select'}</option>
            {ADVERTISER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{ar ? o.ar : o.en}</option>
            ))}
          </select>
        </div>
        {data.advertiser === 'broker' && (
          <>
            <div>
              <label className="admin-input-label">{ar ? 'اسم الوسيط' : 'Broker Name'}</label>
              <input type="text" value={data.brokerName} onChange={(e) => update({ brokerName: e.target.value })} className="admin-input w-full" placeholder={ar ? 'أدخل اسم الوسيط' : 'Enter broker name'} />
            </div>
            <div>
              <label className="admin-input-label">{ar ? 'رقم هاتف الوسيط' : 'Broker Phone'}</label>
              <input type="tel" value={data.brokerPhone} onChange={(e) => update({ brokerPhone: e.target.value })} className="admin-input w-full" placeholder="968 95655200" dir="ltr" />
            </div>
          </>
        )}
      </div>

      {/* 2. هل العقار مرهون؟ - Is Property Mortgaged? */}
      <div>
        <label className="admin-input-label">{ar ? 'هل العقار مرهون؟' : 'Is Property Mortgaged?'}</label>
        <select value={data.isMortgaged} onChange={(e) => update({ isMortgaged: e.target.value })} className="admin-select w-full max-w-xs">
          <option value="">{ar ? 'اختر' : 'Select'}</option>
          <option value="yes">{ar ? 'نعم' : 'Yes'}</option>
          <option value="no">{ar ? 'لا' : 'No'}</option>
        </select>
      </div>

      {/* 3. الواجهة - Facing */}
      <div>
        <label className="admin-input-label">{ar ? 'الواجهة' : 'Facing'}</label>
        <select value={data.facing} onChange={(e) => update({ facing: e.target.value })} className="admin-select w-full max-w-xs">
          <option value="">{ar ? 'اختر' : 'Select'}</option>
          {FACING_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{ar ? o.ar : o.en}</option>
          ))}
        </select>
      </div>

      {/* 4. مواقع قريبة - Nearby Locations */}
      <div>
        <label className="admin-input-label block mb-2">{ar ? 'مواقع قريبة' : 'Nearby Locations'}</label>
        <CheckboxGroup options={NEARBY_LOCATIONS} selected={data.nearbyLocations} onChange={(keys) => update({ nearbyLocations: keys })} ar={ar} />
      </div>

      {/* 5. عدد الغرف، عدد الحمامات، مفروشة */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="admin-input-label">{ar ? 'عدد الغرف' : 'Number of Rooms'}</label>
          <select value={data.roomCount} onChange={(e) => update({ roomCount: e.target.value })} className="admin-select w-full">
            <option value="">{ar ? 'اختر' : 'Select'}</option>
            {ROOM_COUNT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{ar ? o.ar : o.en}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="admin-input-label">{ar ? 'عدد الحمامات' : 'Number of Bathrooms'}</label>
          <select value={data.bathroomCount} onChange={(e) => update({ bathroomCount: e.target.value })} className="admin-select w-full">
            <option value="">{ar ? 'اختر' : 'Select'}</option>
            {BATHROOM_COUNT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{ar ? o.ar : o.en}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="admin-input-label">{ar ? 'مفروشة/غير مفروشة' : 'Furnished'}</label>
          <select value={data.furnished} onChange={(e) => update({ furnished: e.target.value })} className="admin-select w-full">
            <option value="">{ar ? 'اختر' : 'Select'}</option>
            {FURNISHED_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{ar ? o.ar : o.en}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 6. مساحة البناء، مساحة الأرض */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="admin-input-label">{ar ? 'مساحة البناء (م²)' : 'Building Area (m²)'}</label>
          <input type="number" min="0" value={data.buildingArea} onChange={(e) => update({ buildingArea: e.target.value })} className="admin-input w-full" placeholder="0" />
        </div>
        <div>
          <label className="admin-input-label">{ar ? 'مساحة الأرض (م²)' : 'Land Area (m²)'}</label>
          <input type="number" min="0" value={data.landArea} onChange={(e) => update({ landArea: e.target.value })} className="admin-input w-full" placeholder="0" />
        </div>
      </div>

      {/* 7. عدد الطوابق، عمر البناء */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${hideFloorCount ? '' : 'lg:grid-cols-3'} gap-4`}>
        {!hideFloorCount && (
          <div>
            <label className="admin-input-label">{ar ? 'عدد الطوابق' : 'Number of Floors'}</label>
            <select value={data.floorCount} onChange={(e) => update({ floorCount: e.target.value })} className="admin-select w-full">
              <option value="">{ar ? 'اختر' : 'Select'}</option>
              {FLOOR_COUNT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{ar ? o.ar : o.en}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="admin-input-label">{ar ? 'عمر البناء' : 'Building Age'}</label>
          <select value={data.buildingAge} onChange={(e) => update({ buildingAge: e.target.value })} className="admin-select w-full">
            <option value="">{ar ? 'اختر' : 'Select'}</option>
            {BUILDING_AGE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{ar ? o.ar : o.en}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 8. المزايا الرئيسية */}
      <div>
        <ExpandableFeaturesGroup
          label={ar ? 'المزايا الرئيسية' : 'Main Features'}
          options={MAIN_FEATURES}
          selected={data.mainFeatures}
          customItems={data.customMainFeatures}
          onChange={(keys) => update({ mainFeatures: keys })}
          onCustomChange={(items) => update({ customMainFeatures: items })}
          ar={ar}
        />
      </div>

      {/* 9. المزايا الإضافية */}
      <div>
        <ExpandableFeaturesGroup
          label={ar ? 'المزايا الإضافية' : 'Additional Features'}
          options={ADDITIONAL_FEATURES}
          selected={data.additionalFeatures}
          customItems={data.customAdditionalFeatures}
          onChange={(keys) => update({ additionalFeatures: keys })}
          onCustomChange={(items) => update({ customAdditionalFeatures: items })}
          ar={ar}
        />
      </div>
    </div>
  );
}
