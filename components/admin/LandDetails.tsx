'use client';

import { useState } from 'react';
import {
  ADVERTISER_OPTIONS,
  NEARBY_LOCATIONS,
  FACING_OPTIONS,
} from '@/lib/propertyOptions';
import type { VillaApartmentFormData } from './VillaApartmentDetails';

const VISIBLE_NEARBY = 5;

interface LandDetailsProps {
  data: VillaApartmentFormData;
  onChange: (data: VillaApartmentFormData) => void;
  locale: string;
}

export default function LandDetails({ data, onChange, locale }: LandDetailsProps) {
  const ar = locale === 'ar';
  const [nearbyExpanded, setNearbyExpanded] = useState(false);

  const update = (partial: Partial<VillaApartmentFormData>) => {
    onChange({ ...data, ...partial });
  };

  const toggleNearby = (key: string) => {
    if (data.nearbyLocations.includes(key)) {
      update({ nearbyLocations: data.nearbyLocations.filter((k) => k !== key) });
    } else {
      update({ nearbyLocations: [...data.nearbyLocations, key] });
    }
  };

  const visibleNearby = nearbyExpanded ? NEARBY_LOCATIONS : NEARBY_LOCATIONS.slice(0, VISIBLE_NEARBY);
  const hasMoreNearby = NEARBY_LOCATIONS.length > VISIBLE_NEARBY;

  return (
    <div className="space-y-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
        {ar ? 'تفاصيل إضافية للأرض' : 'Additional Land Details'}
      </h3>

      {/* 1. المعلن - Advertiser */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="admin-input-label">{ar ? 'المعلن' : 'Advertiser'}</label>
          <select
            value={data.advertiser}
            onChange={(e) => update({ advertiser: e.target.value })}
            className="admin-select w-full"
          >
            <option value="">{ar ? 'اختر' : 'Select'}</option>
            {ADVERTISER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {ar ? o.ar : o.en}
              </option>
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

      {/* 2. هل العقار مرهون؟ */}
      <div>
        <label className="admin-input-label">{ar ? 'هل العقار مرهون؟' : 'Is Property Mortgaged?'}</label>
        <select
          value={data.isMortgaged}
          onChange={(e) => update({ isMortgaged: e.target.value })}
          className="admin-select w-full max-w-xs"
        >
          <option value="">{ar ? 'اختر' : 'Select'}</option>
          <option value="yes">{ar ? 'نعم' : 'Yes'}</option>
          <option value="no">{ar ? 'لا' : 'No'}</option>
        </select>
      </div>

      {/* 3. الواجهة */}
      <div>
        <label className="admin-input-label">{ar ? 'الواجهة' : 'Facing'}</label>
        <select
          value={data.facing}
          onChange={(e) => update({ facing: e.target.value })}
          className="admin-select w-full max-w-xs"
        >
          <option value="">{ar ? 'اختر' : 'Select'}</option>
          {FACING_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {ar ? o.ar : o.en}
            </option>
          ))}
        </select>
      </div>

      {/* 4. مواقع قريبة */}
      <div>
        <label className="admin-input-label block mb-2">{ar ? 'مواقع قريبة' : 'Nearby Locations'}</label>
        <div className="flex flex-wrap gap-2">
          {visibleNearby.map((opt) => (
            <label
              key={opt.key}
              className="inline-flex items-center gap-2 cursor-pointer py-2 min-h-[44px] touch-manipulation"
            >
              <input
                type="checkbox"
                checked={data.nearbyLocations.includes(opt.key)}
                onChange={() => toggleNearby(opt.key)}
                className="rounded border-gray-300 text-primary focus:ring-primary w-5 h-5 flex-shrink-0"
              />
              <span className="text-sm">{ar ? opt.ar : opt.en}</span>
            </label>
          ))}
        </div>
        {hasMoreNearby && (
          <button
            type="button"
            onClick={() => setNearbyExpanded(!nearbyExpanded)}
            className="text-sm text-primary hover:underline font-medium mt-2"
          >
            {nearbyExpanded
              ? ar ? 'عرض أقل' : 'Show less'
              : `${ar ? 'المزيد' : 'More'} (${NEARBY_LOCATIONS.length - VISIBLE_NEARBY})`}
          </button>
        )}
      </div>
    </div>
  );
}
