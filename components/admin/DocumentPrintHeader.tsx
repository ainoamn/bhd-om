'use client';

import { getCompanyData } from '@/lib/data/companyData';
import { getDefaultTemplate, getTemplateTypeForDocType } from '@/lib/data/documentTemplates';
import { LOGO_SIZE_DEFAULT } from '@/lib/data/documentTemplateConstants';

interface DocumentPrintHeaderProps {
  docType?: string;
  logoSize?: number;
  titleColor?: string;
  headerLayout?: 'left' | 'centered';
  bilingual?: boolean;
  locale: string;
  className?: string;
}

export default function DocumentPrintHeader({
  docType,
  logoSize = LOGO_SIZE_DEFAULT,
  titleColor = '#354058',
  headerLayout = 'left',
  bilingual = false,
  locale,
  className = '',
}: DocumentPrintHeaderProps) {
  const ar = locale === 'ar';
  const company = typeof window !== 'undefined' ? getCompanyData() : null;
  const displayName = company?.nameAr || company?.nameEn || (ar ? 'شركة' : 'Company');
  const size = logoSize || LOGO_SIZE_DEFAULT;

  if (!company) return null;

  const logoAndName = (
    <>
      {company.logoUrl && (
        <div className="shrink-0 overflow-hidden flex items-center justify-center" style={{ width: size, height: size }}>
          <img src={company.logoUrl} alt="Logo" className="w-full h-full object-contain" />
        </div>
      )}
      <div className="min-w-0">
        <h1 className="font-bold text-lg" style={{ color: titleColor }}>
          {bilingual ? (
            <>
              <span dir="rtl">{company.nameAr || displayName}</span>
              <span className="mx-2">|</span>
              <span dir="ltr">{company.nameEn || displayName}</span>
            </>
          ) : (
            ar ? (company.nameAr || displayName) : (company.nameEn || displayName)
          )}
        </h1>
      </div>
    </>
  );

  if (headerLayout === 'centered') {
    return (
      <div className={`border-b-2 pb-3 mb-4 ${className}`} style={{ borderColor: titleColor }}>
        <div className="flex justify-between items-start gap-4">
          {ar ? (
            <>
              <div className="flex-1 text-right min-w-0 order-1" dir="rtl">
                <h1 className="font-bold" style={{ color: titleColor, fontSize: '14pt' }}>{company.nameAr || displayName}</h1>
                <p className="text-xs text-gray-600 mt-0.5">{company.addressAr}</p>
              </div>
              {company.logoUrl && (
                <div className="shrink-0 overflow-hidden flex items-center justify-center mx-2 order-2" style={{ width: size, height: size }}>
                  <img src={company.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                </div>
              )}
              <div className="flex-1 text-left min-w-0 order-3">
                <h1 className="font-bold" style={{ color: titleColor, fontSize: '14pt' }}>{company.nameEn || displayName}</h1>
                <p className="text-xs text-gray-600 mt-0.5">{company.addressEn}</p>
              </div>
            </>
          ) : (
            <>
              <div className="flex-1 text-left min-w-0">
                <h1 className="font-bold" style={{ color: titleColor, fontSize: '14pt' }}>{company.nameEn || displayName}</h1>
                <p className="text-xs text-gray-600 mt-0.5">{company.addressEn}</p>
              </div>
              {company.logoUrl && (
                <div className="shrink-0 overflow-hidden flex items-center justify-center mx-2" style={{ width: size, height: size }}>
                  <img src={company.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                </div>
              )}
              <div className="flex-1 text-right min-w-0" dir="rtl">
                <h1 className="font-bold" style={{ color: titleColor, fontSize: '14pt' }}>{company.nameAr || displayName}</h1>
                <p className="text-xs text-gray-600 mt-0.5">{company.addressAr}</p>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 border-b-2 pb-3 mb-4 ${className}`} style={{ borderColor: titleColor }}>
      {logoAndName}
    </div>
  );
}
