import 'dotenv/config';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { compare } from 'bcryptjs';

const rawUrl = process.env.DATABASE_URL || 'file:./dev.db';
const dbFile = rawUrl.replace(/^file:/, '');
const url =
  path.isAbsolute(dbFile) || /^[A-Za-z]:/.test(dbFile)
    ? rawUrl
    : `file:${path.join(process.cwd(), dbFile.replace(/^\.\//, ''))}`;

console.log('DB URL:', url);

const adapter = new PrismaBetterSqlite3({ url });
const prisma = new PrismaClient({ adapter });

async function run() {
  const u = await prisma.user.findUnique({ where: { email: 'admin@bhd-om.com' } });
  console.log('User found:', !!u, u ? { id: u.id, email: u.email, role: u.role } : '');
  if (u) {
    const ok = await compare('admin123', u.password);
    console.log('Password "admin123" matches:', ok);
  }
  await prisma.$disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
