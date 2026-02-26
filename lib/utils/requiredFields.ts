/**
 * الحقول الإجبارية - سلوك عام لكل الموقع
 * إطار أحمر عند الفراغ | أخضر عند التعبئة
 * نافذة تنبيه عند الحفظ تبين الحقول المتبقية
 */

/** هل القيمة فارغة؟ */
export function isEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/** الحصول على كلاس الحقل الإجباري حسب القيمة */
export function getRequiredFieldClass(isRequired: boolean, value: unknown): string {
  if (!isRequired) return '';
  return isEmpty(value) ? 'input-required-error' : 'input-required-valid';
}

/** عرض تنبيه الحقول المتبقية عند فشل التحقق */
export function showMissingFieldsAlert(missing: string[], ar: boolean): void {
  if (missing.length === 0) return;
  const msg = ar
    ? `يجب إكمال الحقول التالية:\n\n${missing.join('\n')}`
    : `Please complete the following fields:\n\n${missing.join('\n')}`;
  alert(msg);
}
