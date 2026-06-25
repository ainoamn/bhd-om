import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/auth.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function applyRls() {
  const sqlPath = path.join(__dirname, 'sql', 'rls.sql');
  if (!fs.existsSync(sqlPath)) return;
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return;
  const { spawnSync } = await import('child_process');
  const r = spawnSync('psql', [dbUrl, '-v', 'ON_ERROR_STOP=1', '-f', sqlPath], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  if (r.status !== 0) {
    const msg = (r.stderr || r.stdout || '').trim();
    if (!msg.includes('already exists')) {
      console.warn('RLS apply warning:', msg || 'psql failed — install PostgreSQL client or apply rls.sql manually');
    }
  }
}

async function main() {
  const company = await prisma.company.upsert({
    where: { slug: 'bhd-demo' },
    update: {
      trialEndsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
    create: {
      slug: 'bhd-demo',
      nameAr: 'بي إتش دي — تجريبي',
      nameEn: 'BHD Demo Company',
      planCode: 'business',
      maxUsers: 30,
      maxUnits: 15000,
      status: 'active',
      trialEndsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });

  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@bhd.local').toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || 'Admin1234!';

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, displayName: 'مدير النظام' },
    create: {
      email,
      passwordHash,
      displayName: 'مدير النظام',
      locale: 'ar',
    },
  });

  await prisma.companyUser.upsert({
    where: { companyId_userId: { companyId: company.id, userId: user.id } },
    update: { role: 'admin', permissions: ['*'], isActive: true },
    create: {
      companyId: company.id,
      userId: user.id,
      role: 'admin',
      permissions: ['*'],
      isActive: true,
    },
  });

  await applyRls();

  console.log('Seed OK');
  console.log('Company:', company.slug, company.id);
  console.log('Admin:', email, '/', password);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
