/**
 * إعدادات نماذج الوثائق - تُخزّن في localStorage
 */

export type TemplateStyle = 'standard' | 'bordered';
export type PageOrientation = 'portrait' | 'landscape';

export interface DocumentTemplateSettings {
  id: string;
  name: string;
  nameEn?: string;
  isDefault: boolean;
  style: TemplateStyle;
  orientation: PageOrientation;
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

export type TemplateType = 'invoice' | 'quote' | 'creditNote' | 'purchaseOrder' | 'deliveryNote';

const STORAGE_KEY = 'bhd_document_templates';

const DEFAULT_INVOICE: DocumentTemplateSettings = {
  id: 'invoice-1',
  name: 'Invoice template 1',
  nameEn: 'Invoice template 1',
  isDefault: true,
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
};

function getStored(): Record<TemplateType, DocumentTemplateSettings[]> {
  if (typeof window === 'undefined') return {} as Record<TemplateType, DocumentTemplateSettings[]>;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      invoice: parsed.invoice || [DEFAULT_INVOICE],
      quote: parsed.quote || [{ ...DEFAULT_INVOICE, id: 'quote-1', name: 'Quote template 1', nameEn: 'Quote template 1' }],
      creditNote: parsed.creditNote || [{ ...DEFAULT_INVOICE, id: 'credit-1', name: 'Credit note template 1', nameEn: 'Credit note template 1' }],
      purchaseOrder: parsed.purchaseOrder || [{ ...DEFAULT_INVOICE, id: 'po-1', name: 'Purchase order template 1', nameEn: 'Purchase order template 1' }],
      deliveryNote: parsed.deliveryNote || [{ ...DEFAULT_INVOICE, id: 'delivery-1', name: 'Delivery note template 1', nameEn: 'Delivery note template 1' }],
    };
  } catch {
    return {
      invoice: [DEFAULT_INVOICE],
      quote: [{ ...DEFAULT_INVOICE, id: 'quote-1', name: 'Quote template 1', nameEn: 'Quote template 1' }],
      creditNote: [{ ...DEFAULT_INVOICE, id: 'credit-1', name: 'Credit note template 1', nameEn: 'Credit note template 1' }],
      purchaseOrder: [{ ...DEFAULT_INVOICE, id: 'po-1', name: 'Purchase order template 1', nameEn: 'Purchase order template 1' }],
      deliveryNote: [{ ...DEFAULT_INVOICE, id: 'delivery-1', name: 'Delivery note template 1', nameEn: 'Delivery note template 1' }],
    };
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
