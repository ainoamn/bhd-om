'use client';

import { getFeatureIcon, getNearbyIcon, getSpecIcon } from '@/lib/propertyIcons';

interface PropertyIconProps {
  type: 'spec' | 'feature' | 'nearby';
  iconKey: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-6 h-6' };

export default function PropertyIcon({ type, iconKey, className = '', size = 'md' }: PropertyIconProps) {
  const path = type === 'spec' ? getSpecIcon(iconKey) : type === 'feature' ? getFeatureIcon(iconKey) : getNearbyIcon(iconKey);

  return (
    <svg
      className={`${sizes[size]} text-primary flex-shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} />
    </svg>
  );
}
