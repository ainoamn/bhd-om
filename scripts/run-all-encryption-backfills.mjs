#!/usr/bin/env node
/**
 * تشغيل كل سكربتات backfill للتشفير بالترتيب — npm run db:backfill-all-encryption
 */
import { execSync } from 'node:child_process';

const scripts = [
  'db:backfill-booking-encryption',
  'db:backfill-contract-encryption',
  'db:backfill-contact-pii-encryption',
  'db:backfill-address-book-encryption',
  'db:backfill-user-phone-encryption',
  'db:backfill-legacy-kv-encryption',
];

console.log('=== BHD-OM encryption backfill (all) ===\n');

for (const script of scripts) {
  console.log(`--- ${script} ---`);
  execSync(`npm run ${script}`, { stdio: 'inherit' });
  console.log('');
}

console.log('All encryption backfills completed.');
