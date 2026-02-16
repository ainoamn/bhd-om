/**
 * تحديد مصدر البيانات: API (قاعدة البيانات) أو localStorage
 */

export const USE_ACCOUNTING_DB =
  typeof process !== 'undefined' &&
  process.env?.NEXT_PUBLIC_ACCOUNTING_USE_DB === 'true';
