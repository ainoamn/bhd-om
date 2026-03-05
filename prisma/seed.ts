import 'dotenv/config';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/prisma';

async function main() {
  const adminEmail = 'admin@bhd-om.com';
  const adminPassword = 'admin123';
  const hashed = await hash(adminPassword, 10);

  const existing = await prisma.user.findUnique({
    where: { email: adminEmail },
    select: { id: true },
  });

  if (existing) {
    await prisma.user.update({
      where: { email: adminEmail },
      data: { password: hashed, name: 'مدير النظام', role: 'ADMIN', isSuperAdmin: true },
    });
    console.log('Admin user updated:', adminEmail, '(password:', adminPassword + ')');
    return;
  }

  await prisma.user.create({
    data: {
      serialNumber: 'USR-A-2025-0001',
      email: adminEmail,
      password: hashed,
      name: 'مدير النظام',
      role: 'ADMIN',
      isSuperAdmin: true,
    },
  });
  console.log('Admin user created:', adminEmail, '(password:', adminPassword + ')');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
