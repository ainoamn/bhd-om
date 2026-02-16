'use client';

import { icons, type IconName } from '@/lib/icons';

interface IconProps {
  name: IconName;
  className?: string;
  size?: number;
  'aria-hidden'?: boolean;
}

/**
 * مكوّن أيقونة موحد - يدعم إمكانية الوصول
 */
export default function Icon({ name, className = 'w-5 h-5', size, 'aria-hidden': ariaHidden = true }: IconProps) {
  const path = icons[name];
  if (!path) return null;

  return (
    <svg
      className={className}
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden={ariaHidden}
      focusable={false}
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} />
    </svg>
  );
}
