/**
 * إعدادات نماذج الوثائق - تُخزّن في localStorage
 * مواصفات فنية ومحاسبية عالية
 */

import type { TemplateVariant } from './documentTemplateConstants';

export type TemplateStyle = 'standard' | 'bordered';
export type PageOrientation = 'portrait' | 'landscape';
export type HeaderLayout = 'left' | 'centered';

export interface DocumentTemplateSettings {
  id: string;
  name: string;
  nameEn?: string;
  isDefault: boolean;
  variant?: TemplateVariant;
  headerLayout?: HeaderLayout;
  style: TemplateStyle;
  orientation: PageOrientation;
  bilingual?: boolean;
  logoSize?: number;
  titleColor: string;
  titleFontSize: number;
  textColor: string;
  textFontSize: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  updatedAt: string;
}

export type TemplateType = 'invoice' | 'receipt' | 'quote' | 'creditNote' | 'purchaseOrder' | 'deliveryNote' | 'report';

const STORAGE_KEY = 'bhd_document_templates';

const baseTemplate = (id: string, name: string, nameEn: string, variant: TemplateVariant = 'classic', bilingual = false, headerLayout: HeaderLayout = 'left'): DocumentTemplateSettings => ({
  id,
  name,
  nameEn,
  isDefault: false,
  variant,
  headerLayout,
  bilingual,
  logoSize: 80,
  style: 'standard',
  orientation: 'portrait',
  titleColor: '#354058',
  titleFontSize: 9,
  textColor: '#354058',
  textFontSize: 9,
  marginTop: 15,
  marginBottom: 20,
  marginLeft: 10,
  marginRight: 10,
  updatedAt: new Date().toISOString(),
});

const DEFAULT_TEMPLATES: Record<TemplateType, DocumentTemplateSettings[]> = {
  invoice: [
    { ...baseTemplate('invoice-1', 'فاتورة كلاسيكية', 'Invoice Classic', 'classic'), isDefault: true },
    { ...baseTemplate('invoice-2', 'فاتورة احترافية', 'Invoice Professional', 'professional') },
    { ...baseTemplate('invoice-3', 'فاتورة عصرية', 'Invoice Modern', 'modern') },
    { ...baseTemplate('invoice-4', 'فاتورة مختصرة', 'Invoice Compact', 'compact') },
    { ...baseTemplate('invoice-5', 'فاتورة ثنائية اللغة', 'Invoice Bilingual', 'bilingual', true) },
    { ...baseTemplate('invoice-6', 'فاتورة شعار وسط', 'Invoice Centered Logo', 'classic', false, 'centered') },
    { ...baseTemplate('invoice-7', 'فاتورة شعار وسط ثنائية اللغة', 'Invoice Centered Bilingual', 'bilingual', true, 'centered') },
  ],
  receipt: [
    { ...baseTemplate('receipt-1', 'إيصال كلاسيكي', 'Receipt Classic', 'classic'), isDefault: true },
    { ...baseTemplate('receipt-2', 'إيصال احترافي', 'Receipt Professional', 'professional') },
    { ...baseTemplate('receipt-3', 'إيصال عصري', 'Receipt Modern', 'modern') },
    { ...baseTemplate('receipt-4', 'إيصال مختصر', 'Receipt Compact', 'compact') },
    { ...baseTemplate('receipt-5', 'إيصال ثنائي اللغة', 'Receipt Bilingual', 'bilingual', true) },
    { ...baseTemplate('receipt-6', 'إيصال شعار وسط ثنائي اللغة', 'Receipt Centered Bilingual', 'bilingual', true, 'centered') },
  ],
  quote: [
    { ...baseTemplate('quote-1', 'عرض سعر كلاسيكي', 'Quote Classic', 'classic'), isDefault: true },
    { ...baseTemplate('quote-2', 'عرض سعر احترافي', 'Quote Professional', 'professional') },
    { ...baseTemplate('quote-3', 'عرض سعر عصري', 'Quote Modern', 'modern') },
    { ...baseTemplate('quote-4', 'عرض سعر شعار وسط ثنائي اللغة', 'Quote Centered Bilingual', 'bilingual', true, 'centered') },
  ],
  creditNote: [
    { ...baseTemplate('credit-1', 'إشعار دائن كلاسيكي', 'Credit Note Classic', 'classic'), isDefault: true },
    { ...baseTemplate('credit-2', 'إشعار دائن احترافي', 'Credit Note Professional', 'professional') },
    { ...baseTemplate('credit-3', 'إشعار دائن شعار وسط ثنائي اللغة', 'Credit Note Centered Bilingual', 'bilingual', true, 'centered') },
  ],
  purchaseOrder: [
    { ...baseTemplate('po-1', 'أمر شراء كلاسيكي', 'Purchase Order Classic', 'classic'), isDefault: true },
    { ...baseTemplate('po-2', 'أمر شراء احترافي', 'Purchase Order Professional', 'professional') },
    { ...baseTemplate('po-3', 'أمر شراء شعار وسط ثنائي اللغة', 'PO Centered Bilingual', 'bilingual', true, 'centered') },
  ],
  deliveryNote: [
    { ...baseTemplate('delivery-1', 'إشعار تسليم كلاسيكي', 'Delivery Note Classic', 'classic'), isDefault: true },
    { ...baseTemplate('delivery-2', 'إشعار تسليم احترافي', 'Delivery Note Professional', 'professional') },
    { ...baseTemplate('delivery-3', 'إشعار تسليم شعار وسط ثنائي اللغة', 'Delivery Note Centered Bilingual', 'bilingual', true, 'centered') },
  ],
  report: [
    { ...baseTemplate('report-1', 'تقرير كلاسيكي', 'Report Classic', 'classic'), isDefault: true },
    { ...baseTemplate('report-2', 'تقرير احترافي', 'Report Professional', 'professional') },
    { ...baseTemplate('report-3', 'تقرير شعار وسط ثنائي اللغة', 'Report Centered Bilingual', 'bilingual', true, 'centered') },
  ],
};

function getStored(): Record<TemplateType, DocumentTemplateSettings[]> {
  if (typeof window === 'undefined') return DEFAULT_TEMPLATES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const result: Record<TemplateType, DocumentTemplateSettings[]> = {} as Record<TemplateType, DocumentTemplateSettings[]>;
    for (const type of Object.keys(DEFAULT_TEMPLATES) as TemplateType[]) {
      const stored = parsed[type];
      if (Array.isArray(stored) && stored.length > 0) {
        const defaults = DEFAULT_TEMPLATES[type];
        const merged = stored.map((t) => ({ variant: 'classic' as const, headerLayout: 'left' as const, bilingual: false, logoSize: 80, ...defaults[0], ...t }));
        const existingIds = new Set(merged.map((m) => m.id));
        const toAdd = defaults.filter((d) => !existingIds.has(d.id));
        result[type] = [...merged, ...toAdd];
      } else {
        result[type] = DEFAULT_TEMPLATES[type];
      }
    }
    return result;
  } catch {
    return DEFAULT_TEMPLATES;
  }
}

function saveStored(data: Record<TemplateType, DocumentTemplateSettings[]>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
  } catch {}
}

/** الحصول على قوالب نوع معين */
export function getTemplates(type: TemplateType): DocumentTemplateSettings[] {
  return getStored()[type] || [];
}

/** الحصول على القالب الافتراضي لنوع معين */
export function getDefaultTemplate(type: TemplateType): DocumentTemplateSettings | null {
  const list = getTemplates(type);
  return list.find((t) => t.isDefault) || list[0] || null;
}

/** تحديث قالب */
export function updateTemplate(type: TemplateType, id: string, updates: Partial<DocumentTemplateSettings>): void {
  const data = getStored();
  const list = data[type] || [];
  const idx = list.findIndex((t) => t.id === id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...updates, updatedAt: new Date().toISOString() };
    if (updates.isDefault) {
      list.forEach((t, i) => { if (i !== idx) list[i] = { ...t, isDefault: false }; });
    }
    data[type] = list;
    saveStored(data);
  }
}

/** تعيين قالب كافتراضي */
export function setDefaultTemplate(type: TemplateType, id: string): void {
  updateTemplate(type, id, { isDefault: true });
}

/** ربط نوع المستند المحاسبي بنوع القالب */
export function getTemplateTypeForDocType(docType: string): TemplateType {
  const map: Record<string, TemplateType> = {
    INVOICE: 'invoice',
    RECEIPT: 'receipt',
    QUOTE: 'quote',
    DEPOSIT: 'receipt',
    PAYMENT: 'receipt',
    CREDIT_NOTE: 'creditNote',
    DEBIT_NOTE: 'creditNote',
    PURCHASE_INV: 'purchaseOrder',
    PURCHASE_ORDER: 'purchaseOrder',
  };
  return map[docType] || 'invoice';
}
