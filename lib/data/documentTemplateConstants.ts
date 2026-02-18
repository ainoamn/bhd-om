/**
 * ثوابت نماذج الوثائق - مواصفات فنية ومحاسبية
 * Document Template Constants - Technical & Accounting Standards
 */

/** مقاسات ثابتة للتوقيع والختم - تُطبّق على جميع الصور المرفوعة */
export const SIGNATURE_SIZE = { width: 140, height: 50 };
export const STAMP_SIZE = { width: 80, height: 80 };

/** أحجام الشعار المتاحة في النماذج (بكسل) */
export const LOGO_SIZE_OPTIONS = [48, 64, 80, 96, 112, 128] as const;
export const LOGO_SIZE_DEFAULT = 80;

/** أنماط القوالب */
export type TemplateVariant = 'classic' | 'professional' | 'modern' | 'compact' | 'bilingual';

export const TEMPLATE_VARIANT_LABELS: Record<TemplateVariant, { ar: string; en: string }> = {
  classic: { ar: 'كلاسيكي', en: 'Classic' },
  professional: { ar: 'احترافي', en: 'Professional' },
  modern: { ar: 'عصري', en: 'Modern' },
  compact: { ar: 'مختصر', en: 'Compact' },
  bilingual: { ar: 'ثنائي اللغة', en: 'Bilingual' },
};

/** أحجام الورق القياسية (مم) */
export const PAPER_SIZES = {
  A4: { width: 210, height: 297 },
  A5: { width: 148, height: 210 },
} as const;
