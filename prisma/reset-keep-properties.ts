/**
 * تصفير قاعدة البيانات مع الإبقاء على جدول العقارات فقط.
 *
 * التشغيل (إلزامي تأكيد):
 *   CONFIRM_RESET=yes npx tsx prisma/reset-keep-properties.ts
 *
 * متغيرات اختيارية:
 *   RESET_ADMIN_EMAIL=admin@bhd-om.com
 *   RESET_ADMIN_PASSWORD=كلمة_سر_قوية
 */

import 'dotenv/config';
import { prisma } from '@/lib/prisma';
import { executeResetKeepProperties } from '@/lib/server/dataResetKeepProperties';

async function main() {
  if (process.env.CONFIRM_RESET !== 'yes') {
    console.error('مرفوض: عيّن CONFIRM_RESET=yes لتنفيذ التصفير.');
    process.exit(1);
  }

  console.log('بدء التصفير — الإبقاء على العقارات فقط…');

  const result = await executeResetKeepProperties(prisma);

  console.log('تم التصفير.');
  console.log('العقارات: محفوظة (بدون مالك/منشئ/شركة مرتبطة).');
  console.log('مستخدم الإدارة:', result.adminEmail);
  console.log('الرقم المتسلسل:', result.serialNumber);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
