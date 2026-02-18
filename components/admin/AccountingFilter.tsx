'use client';

import { useState } from 'react';
import Icon from '@/components/icons/Icon';

export interface FilterField {
  key: string;
  labelAr: string;
  labelEn: string;
  type: 'text' | 'select' | 'date' | 'daterange';
  options?: { value: string; labelAr: string; labelEn: string }[];
  placeholderAr?: string;
  placeholderEn?: string;
}

interface AccountingFilterProps {
  fields: FilterField[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onReset: () => void;
  ar: boolean;
  resultCount?: number;
  compact?: boolean;
}

export default function AccountingFilter({
  fields,
  values,
  onChange,
  onReset,
  ar,
  resultCount,
  compact = false,
}: AccountingFilterProps) {
  const [expanded, setExpanded] = useState(!compact);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between gap-2 hover:bg-gray-50 transition-colors"
      >
        <span className="font-semibold text-gray-800 flex items-center gap-2">
          <Icon name="funnel" className="w-5 h-5 text-[#8B6F47]" />
          {ar ? 'فلترة متقدمة' : 'Advanced Filter'}
        </span>
        {resultCount != null && (
          <span className="text-sm text-gray-500">
            {ar ? `${resultCount} نتيجة` : `${resultCount} result(s)`}
          </span>
        )}
        <Icon name={expanded ? 'chevronUp' : 'chevronDown'} className="w-5 h-5 text-gray-500" />
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-100">
          <div className={`grid gap-4 ${compact ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
            {fields.map((f) => (
              <div key={f.key}>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  {ar ? f.labelAr : f.labelEn}
                </label>
                {f.type === 'text' && (
                  <input
                    type="text"
                    value={values[f.key] || ''}
                    onChange={(e) => onChange(f.key, e.target.value)}
                    placeholder={ar ? f.placeholderAr : f.placeholderEn}
                    className="admin-input w-full text-sm py-2"
                  />
                )}
                {f.type === 'select' && (
                  <select
                    value={values[f.key] || ''}
                    onChange={(e) => onChange(f.key, e.target.value)}
                    className="admin-select w-full text-sm py-2"
                  >
                    <option value="">{ar ? '— الكل —' : '— All —'}</option>
                    {f.options?.map((o) => (
                      <option key={o.value} value={o.value}>
                        {ar ? o.labelAr : o.labelEn}
                      </option>
                    ))}
                  </select>
                )}
                {f.type === 'date' && (
                  <input
                    type="date"
                    value={values[f.key] || ''}
                    onChange={(e) => onChange(f.key, e.target.value)}
                    className="admin-input w-full text-sm py-2"
                  />
                )}
                {f.type === 'daterange' && (
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={values[`${f.key}From`] || ''}
                      onChange={(e) => onChange(`${f.key}From`, e.target.value)}
                      className="admin-input flex-1 text-sm py-2"
                    />
                    <input
                      type="date"
                      value={values[`${f.key}To`] || ''}
                      onChange={(e) => onChange(`${f.key}To`, e.target.value)}
                      className="admin-input flex-1 text-sm py-2"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={onReset}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              {ar ? 'إعادة تعيين' : 'Reset'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
