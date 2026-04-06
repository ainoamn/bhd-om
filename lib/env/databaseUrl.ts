/**
 * حل عنوان PostgreSQL من متغيرات البيئة — يدعم Vercel Postgres (POSTGRES_PRISMA_URL / POSTGRES_URL)
 * إضافةً إلى DATABASE_URL الصريح و Neon (NEON_DATABASE_URL).
 */

const ENV_KEYS = [
  'DATABASE_URL',
  'POSTGRES_PRISMA_URL',
  'POSTGRES_URL',
  'NEON_DATABASE_URL',
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

/**
 * Neon / Vercel / معظم السحاب — غالباً يتطلب TLS. إن لم يُذكر sslmode في الرابط نُلحق require.
 * لا نُطبّق على localhost حتى لا نكسر تطويراً محلياً بدون SSL.
 */
export function appendSslModeRequireForRemoteHosts(urlStr: string): string {
  const trimmed = urlStr.trim();
  if (!trimmed) return trimmed;
  try {
    const forParse = trimmed.replace(/^postgres:\/\//i, 'postgresql://');
    const u = new URL(forParse);
    const host = u.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
      return trimmed;
    }
    if (/[?&]sslmode=/i.test(trimmed) || /[?&]ssl=true\b/i.test(trimmed)) {
      return trimmed;
    }
    return trimmed.includes('?') ? `${trimmed}&sslmode=require` : `${trimmed}?sslmode=require`;
  } catch {
    return trimmed;
  }
}

/**
 * معاملات مناسبة لـ serverless (Vercel + Neon pooler): مهلة اتصال، ووضع pgbouncer لـ Neon عند الحاجة.
 * @see https://neon.tech/docs/guides/prisma
 */
function applyServerlessPostgresParams(urlStr: string): string {
  const trimmed = urlStr.trim();
  if (!trimmed) return trimmed;
  try {
    const usePostgresScheme = trimmed.startsWith('postgres://');
    const forParse = trimmed.replace(/^postgres:\/\//i, 'postgresql://');
    const u = new URL(forParse);
    const host = u.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
      return trimmed;
    }
    if (!u.searchParams.has('connect_timeout')) {
      u.searchParams.set('connect_timeout', '30');
    }
    /** فقط لعنوان Neon المجمّع (pooler) — لا نضيفها لرابط الاتصال المباشر */
    if (host.includes('pooler') && host.includes('neon') && !u.searchParams.has('pgbouncer')) {
      u.searchParams.set('pgbouncer', 'true');
    }
    let out = u.toString();
    if (usePostgresScheme) {
      out = out.replace(/^postgresql:\/\//i, 'postgres://');
    }
    return out;
  } catch {
    return trimmed;
  }
}

/** للتطبيق (Next): في الإنتاج بدون أي رابط صالح يُرجع سلسلة فارغة ليُرفَض الإنشاء بوضوح */
export function getDatabaseUrlForRuntime(): string {
  const found = firstPostgresUrl();
  if (found) return applyServerlessPostgresParams(appendSslModeRequireForRemoteHosts(found));
  if (process.env.NODE_ENV === 'production') return '';
  return LOCAL_DEV_DEFAULT;
}

/** لأداة Prisma CLI (migrate / db push): دائماً عنوان صالح للتطوير المحلي عند الغياب */
export function getDatabaseUrlForPrismaCli(): string {
  const found = firstPostgresUrl();
  if (found) return applyServerlessPostgresParams(appendSslModeRequireForRemoteHosts(found));
  return LOCAL_DEV_DEFAULT;
}
