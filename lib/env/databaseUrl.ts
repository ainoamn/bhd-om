/**
 * حل عنوان PostgreSQL من متغيرات البيئة — يدعم Vercel Postgres (POSTGRES_PRISMA_URL / POSTGRES_URL)
 * إضافةً إلى DATABASE_URL الصريح.
 */

const ENV_KEYS = [
  'DATABASE_URL',
  'POSTGRES_PRISMA_URL',
  'POSTGRES_URL',
  'PRISMA_DATABASE_URL',
] as const;

function firstPostgresUrl(): string | null {
  for (const key of ENV_KEYS) {
    const v = process.env[key]?.trim();
    if (v && (v.startsWith('postgresql://') || v.startsWith('postgres://'))) {
      return v;
    }
  }
  return null;
}

const LOCAL_DEV_DEFAULT = 'postgresql://postgres:postgres@127.0.0.1:5432/bhd_om';

/** للتطبيق (Next): في الإنتاج بدون أي رابط صالح يُرجع سلسلة فارغة ليُرفَض الإنشاء بوضوح */
export function getDatabaseUrlForRuntime(): string {
  const found = firstPostgresUrl();
  if (found) return found;
  if (process.env.NODE_ENV === 'production') return '';
  return LOCAL_DEV_DEFAULT;
}

/** لأداة Prisma CLI (migrate / db push): دائماً عنوان صالح للتطوير المحلي عند الغياب */
export function getDatabaseUrlForPrismaCli(): string {
  return firstPostgresUrl() ?? LOCAL_DEV_DEFAULT;
}
