'use client';

export type SortOption = 'dateDesc' | 'dateAsc' | 'number' | 'property' | 'alphabetical';

export const SORT_OPTIONS: { value: SortOption; labelAr: string; labelEn: string }[] = [
  { value: 'dateDesc', labelAr: 'الأحدث إلى الأقدم', labelEn: 'Newest to oldest' },
  { value: 'dateAsc', labelAr: 'الأقدم إلى الأحدث', labelEn: 'Oldest to newest' },
  { value: 'number', labelAr: 'بحسب الرقم', labelEn: 'By number' },
  { value: 'property', labelAr: 'بحسب المبنى', labelEn: 'By property' },
  { value: 'alphabetical', labelAr: 'بحسب الحروف الهجائية', labelEn: 'Alphabetically' },
];

interface SortSelectProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
  ar: boolean;
  className?: string;
}

export default function SortSelect({ value, onChange, ar, className = '' }: SortSelectProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label className="text-sm font-medium text-gray-600 whitespace-nowrap">
        {ar ? 'الفرز:' : 'Sort:'}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortOption)}
        className="admin-select text-sm py-1.5 px-3 min-w-[140px]"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {ar ? o.labelAr : o.labelEn}
          </option>
        ))}
      </select>
    </div>
  );
}
