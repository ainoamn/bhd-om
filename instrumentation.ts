/**
 * يُشغَّل عند بدء السيرفر — تحذير إذا نقصت متغيرات الأمان في production.
 */
export async function register() {
  if (process.env.NODE_ENV !== 'production') return;

  const required = [
    'NEXTAUTH_SECRET',
    'DATABASE_URL',
    'ENCRYPTION_MASTER_KEY',
    'CRON_SECRET',
    'THAWANI_WEBHOOK_SECRET',
    'ADMIN_DATA_RESET_PIN',
  ] as const;

  const missing = required.filter((k) => !process.env[k]?.trim());
  if (missing.length > 0) {
    console.error(
      `[SECURITY] Missing required production environment variables: ${missing.join(', ')}`
    );
  }

  const hasUpstash =
    Boolean(process.env.UPSTASH_REDIS_REST_URL?.trim()) &&
    Boolean(process.env.UPSTASH_REDIS_REST_TOKEN?.trim());
  if (!hasUpstash) {
    console.warn(
      '[SECURITY] UPSTASH_REDIS_REST_URL/TOKEN not set — rate limits use in-memory store (resets on cold start).'
    );
  }
}
