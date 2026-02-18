/**
 * بيانات الشركة - شعار، بيانات، توقيع، ختم
 * تُخزّن في localStorage
 */

import { siteConfig } from '@/config/site';

export type SignatureType = 'image' | 'electronic';

export interface CompanyData {
  logoUrl: string;
  nameAr: string;
  nameEn: string;
  addressAr: string;
  addressEn: string;
  crNumber: string;
  vatNumber: string;
  phone: string;
  email: string;
  signatoryName: string;
  signatoryNameEn: string;
  signatoryPosition: string;
  signatoryPositionEn: string;
  signatureType: SignatureType;
  signatorySignatureUrl: string;
  companyStampUrl: string;
  updatedAt: string;
}

const STORAGE_KEY = 'bhd_company_data';

const DEFAULT: CompanyData = {
  logoUrl: '/logo-bhd.png',
  nameAr: siteConfig.company.nameAr,
  nameEn: siteConfig.company.nameEn,
  addressAr: 'مسقط - المعبيلة الجنوبية - رقم الشارع: 8401 - رقم المجمع: 384 - رقم المبنى: 75 - نقال 91115341 - 95655200، السيب، عُمان',
  addressEn: 'Muscat - South Mabelah - Street: 8401 - Complex: 384 - Building: 75 - GSM: 91115341 - 95655200, Al Seeb, Oman',
  crNumber: '',
  vatNumber: '',
  phone: siteConfig.company.phone,
  email: siteConfig.company.email,
  signatoryName: '',
  signatoryNameEn: '',
  signatoryPosition: '',
  signatoryPositionEn: '',
  signatureType: 'image',
  signatorySignatureUrl: '',
  companyStampUrl: '',
  updatedAt: new Date().toISOString(),
};

function getStored(): CompanyData {
  if (typeof window === 'undefined') return { ...DEFAULT };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<CompanyData>;
      return { ...DEFAULT, ...parsed };
    }
  } catch {}
  return { ...DEFAULT };
}

function saveStored(data: CompanyData): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, updatedAt: new Date().toISOString() }));
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
    window.dispatchEvent(new CustomEvent('bhd_company_data_updated'));
  } catch {}
}

/** الحصول على بيانات الشركة */
export function getCompanyData(): CompanyData {
  return getStored();
}

/** حفظ بيانات الشركة */
export function saveCompanyData(updates: Partial<CompanyData>): void {
  const current = getStored();
  saveStored({ ...current, ...updates });
}
