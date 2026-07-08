#!/usr/bin/env node
/**
 * فحص أمني سريع — npm run security:audit
 * يشغّل npm audit ويتحقق من متغيرات env المطلوبة في production.
 */
import { execSync } from 'node:child_process';

const requiredInProd = [
  'NEXTAUTH_SECRET',
  'DATABASE_URL',
  'ENCRYPTION_MASTER_KEY',
  'CRON_SECRET',
  'THAWANI_WEBHOOK_SECRET',
  'ADMIN_DATA_RESET_PIN',
];

console.log('=== BHD-OM Security Audit ===\n');

console.log('--- npm audit (high+) ---');
try {
  execSync('npm audit --audit-level=high', { stdio: 'inherit' });
} catch {
  console.error('npm audit reported issues — review above.');
  process.exitCode = 1;
}

console.log('\n--- Production env checklist (local .env) ---');
let missing = 0;
for (const key of requiredInProd) {
  const val = process.env[key]?.trim();
  const ok = Boolean(val && val.length >= (key.includes('PIN') ? 8 : 1));
  console.log(`${ok ? 'OK' : 'MISSING'}  ${key}`);
  if (!ok) missing++;
}

if (missing > 0) {
  console.log(`\n${missing} variable(s) missing locally — set in Vercel for production.`);
}

console.log('\nDone.');
