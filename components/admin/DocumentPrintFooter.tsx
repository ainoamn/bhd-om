'use client';

import { getCompanyData } from '@/lib/data/companyData';

interface DocumentPrintFooterProps {
  locale: string;
  className?: string;
}

export default function DocumentPrintFooter({ locale, className = '' }: DocumentPrintFooterProps) {
  const ar = locale === 'ar';
  const company = typeof window !== 'undefined' ? getCompanyData() : null;
  if (!company) return null;

  const details = [
    company.nameAr && company.nameEn && `${company.nameAr} | ${company.nameEn}`,
    company.addressAr || company.addressEn,
    company.phone,
    company.email,
    company.crNumber && (ar ? `سجل: ${company.crNumber}` : `CR: ${company.crNumber}`),
    company.vatNumber && (ar ? `ضريبة: ${company.vatNumber}` : `VAT: ${company.vatNumber}`),
  ].filter(Boolean);

  return (
    <div className={`mt-8 pt-4 border-t border-gray-200 text-center text-xs text-gray-600 ${className}`}>
      <p>{details.join(' · ')}</p>
    </div>
  );
}
