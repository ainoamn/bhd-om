'use client';

import { useLocale } from 'next-intl';

interface SerialBadgeProps {
  serialNumber: string;
  className?: string;
  /** compact: نص صغير للبطاقات */
  compact?: boolean;
}

/**
 * شارة الرقم المتسلسل - للتمييز والبحث
 */
export default function SerialBadge({ serialNumber, className = '', compact }: SerialBadgeProps) {
  const locale = useLocale();

  return (
    <div
      className={`inline-flex items-center gap-1.5 font-mono font-semibold text-gray-600 ${compact ? 'text-xs' : 'text-sm'} ${className}`}
      title={locale === 'ar' ? `الرقم المرجعي: ${serialNumber}` : `Reference: ${serialNumber}`}
    >
      <span className="text-primary">{serialNumber}</span>
    </div>
  );
}
