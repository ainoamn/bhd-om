import { config as loadEnv } from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'prisma/config';
import { getDatabaseUrlForPrismaCli } from './lib/env/databaseUrl';

/** تحميل صريح لـ `.env` بجانب هذا الملف — يتجنب الاعتماد على `cwd` عند `npx prisma` */
const projectRoot = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(projectRoot, '.env') });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'npx tsx prisma/seed.ts',
  },
  datasource: {
    url: getDatabaseUrlForPrismaCli(),
  },
});
