/** التحقق من الأسرار الإلزامية في الإنتاج — يُستدعى عند بدء المسارات الحساسة */
export function requireProductionSecret(name: string, value: string | undefined): string {
  const v = (value ?? '').trim();
  if (process.env.NODE_ENV === 'production' && !v) {
    throw new Error(`${name} is required in production`);
  }
  return v;
}

export function getCronSecret(): string {
  return requireProductionSecret('CRON_SECRET', process.env.CRON_SECRET);
}

export function getThawaniWebhookSecret(): string {
  return requireProductionSecret('THAWANI_WEBHOOK_SECRET', process.env.THAWANI_WEBHOOK_SECRET);
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}
