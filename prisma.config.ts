import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// قاعدة بيانات حقيقية قابلة للتوسع — استخدم رابط Pooled في الإنتاج (Neon/Vercel Postgres)
const raw = process.env.DATABASE_URL?.trim() || '';
const databaseUrl =
  raw && (raw.startsWith('postgresql://') || raw.startsWith('postgres://'))
    ? raw
    : 'postgresql://postgres:postgres@127.0.0.1:5432/bhd_om';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'npx tsx prisma/seed.ts',
  },
  datasource: {
    url: databaseUrl,
  },
});
