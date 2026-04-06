import 'dotenv/config';
import { defineConfig } from 'prisma/config';
import { getDatabaseUrlForPrismaCli } from './lib/env/databaseUrl';

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
