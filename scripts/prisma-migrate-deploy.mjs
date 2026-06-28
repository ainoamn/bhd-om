#!/usr/bin/env node
/**
 * Vercel/Neon: migrate deploy needs a direct Postgres URL and may wait on advisory locks
 * when another deploy holds the migration lock.
 */
import { spawnSync } from 'node:child_process';

const maxAttempts = Number(process.env.PRISMA_MIGRATE_DEPLOY_ATTEMPTS || 3);
const retryDelayMs = Number(process.env.PRISMA_MIGRATE_DEPLOY_RETRY_MS || 15000);
const lockTimeoutMs = process.env.PRISMA_MIGRATE_ADVISORY_LOCK_TIMEOUT || '120000';

process.env.PRISMA_MIGRATE_ADVISORY_LOCK_TIMEOUT = lockTimeoutMs;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runMigrate() {
  return spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32',
  });
}

async function main() {
  console.log(`[migrate] advisory lock timeout: ${lockTimeoutMs}ms`);

  let last = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (attempt > 1) {
      console.log(`[migrate] retry ${attempt}/${maxAttempts} after ${retryDelayMs}ms…`);
      await sleep(retryDelayMs);
    } else {
      console.log(`[migrate] deploy attempt ${attempt}/${maxAttempts}…`);
    }

    last = runMigrate();
    if (last.status === 0) {
      console.log('[migrate] deploy succeeded');
      process.exit(0);
    }
  }

  console.error(`[migrate] deploy failed after ${maxAttempts} attempt(s)`);
  process.exit(typeof last?.status === 'number' ? last.status : 1);
}

main().catch((err) => {
  console.error('[migrate] unexpected error', err);
  process.exit(1);
});
