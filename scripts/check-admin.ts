import 'dotenv/config';
import { prisma } from '@/lib/prisma';
import { compare } from 'bcryptjs';

console.log('DATABASE_URL set:', !!process.env.DATABASE_URL);

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
