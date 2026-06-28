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

/** اتصال مباشر (بدون pooler) — مطلوب لـ prisma migrate deploy على Neon */
const MIGRATE_DIRECT_ENV_KEYS = [
  'DATABASE_URL_UNPOOLED',
  'DIRECT_URL',
  'POSTGRES_URL_NON_POOLING',
  'NEON_DATABASE_URL_UNPOOLED',
  /** على Vercel Postgres غالباً direct؛ POSTGRES_PRISMA_URL = pooled */
  'POSTGRES_URL',
] as const;

function isPostgresUrl(v: string): boolean {
  return v.startsWith('postgresql://') || v.startsWith('postgres://');
}

function firstPostgresUrl(): string | null {
  for (const key of ENV_KEYS) {
    const v = process.env[key]?.trim();
    if (v && isPostgresUrl(v)) {
      return v;
    }
  }
  return null;
}

function firstDirectPostgresUrl(): string | null {
  for (const key of MIGRATE_DIRECT_ENV_KEYS) {
    const v = process.env[key]?.trim();
    if (v && isPostgresUrl(v)) {
      return v;
    }
  }
  return null;
}

/** Neon pooler → direct host (ep-xxx-pooler.region → ep-xxx.region) */
function neonPoolerHostToDirect(urlStr: string): string {
  return urlStr.replace(/-pooler(\.[a-z0-9-]+\.neon\.tech)/i, '$1');
}

function stripPgbouncerQueryParams(urlStr: string): string {
  const trimmed = urlStr.trim();
  if (!trimmed) return trimmed;
  try {
    const usePostgresScheme = trimmed.startsWith('postgres://');
    const forParse = trimmed.replace(/^postgres:\/\//i, 'postgresql://');
    const u = new URL(forParse);
    u.searchParams.delete('pgbouncer');
    let out = u.toString();
    if (usePostgresScheme) {
      out = out.replace(/^postgresql:\/\//i, 'postgres://');
    }
    return out;
  } catch {
    return trimmed;
  }
}

function applyMigrateConnectionParams(urlStr: string): string {
  const trimmed = urlStr.trim();
  if (!trimmed) return trimmed;
  try {
    const usePostgresScheme = trimmed.startsWith('postgres://');
    const forParse = trimmed.replace(/^postgres:\/\//i, 'postgresql://');
    const u = new URL(forParse);
    const host = u.hostname.toLowerCase();
    if (host !== 'localhost' && host !== '127.0.0.1' && host !== '::1') {
      if (!u.searchParams.has('connect_timeout')) {
        u.searchParams.set('connect_timeout', '60');
      }
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

/** يحوّل أي رابط Neon pooler إلى direct — migrate deploy يتطلب advisory locks */
function normalizeMigratePostgresUrl(urlStr: string): string {
  const directHost = neonPoolerHostToDirect(stripPgbouncerQueryParams(urlStr.trim()));
  return applyMigrateConnectionParams(appendSslModeRequireForRemoteHosts(directHost));
}

/** لأداة Prisma CLI (migrate): اتصال مباشر — لا pooler (advisory locks) */
export function getDatabaseUrlForPrismaMigrate(): string {
  const direct = firstDirectPostgresUrl();
  if (direct) return normalizeMigratePostgresUrl(direct);
  const pooled = firstPostgresUrl();
  if (pooled) return normalizeMigratePostgresUrl(pooled);
  return LOCAL_DEV_DEFAULT;
}

/** لأداة Prisma CLI (generate / studio): نفس اتصال migrate — direct على Neon */
export function getDatabaseUrlForPrismaCli(): string {
  return getDatabaseUrlForPrismaMigrate();
}
