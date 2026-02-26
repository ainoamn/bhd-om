import 'dotenv/config';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/prisma';

async function main() {
  const adminEmail = 'admin@bhd-om.com';
  const existing = await prisma.user.findUnique({
    where: { email: adminEmail },
  });
  if (existing) {
    console.log('Admin user already exists:', adminEmail);
    return;
  }
  const hashed = await hash('admin123', 10);
  await prisma.user.create({
    data: {
      serialNumber: 'USR-A-2025-0001',
      email: adminEmail,
      password: hashed,
      name: 'مدير النظام',
      role: 'ADMIN',
    },
  });
  console.log('Admin user created:', adminEmail, '(password: admin123)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
