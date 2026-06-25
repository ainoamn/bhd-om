import { prisma } from '../lib/prisma.js';

const INTERVAL_MS = parseInt(process.env.TRIAL_EXPIRY_CHECK_MS || String(60 * 60 * 1000), 10);

/** تعليق الشركات التي انتهت تجربتها — يعمل في الخلفية دون واجهة */
export async function runTrialExpiryCheck() {
  const now = new Date();
  const expired = await prisma.company.findMany({
    where: {
      status: 'trial',
      trialEndsAt: { lt: now },
    },
    select: { id: true, slug: true },
  });

  if (!expired.length) return { suspended: 0 };

  await prisma.company.updateMany({
    where: { id: { in: expired.map((c) => c.id) } },
    data: { status: 'suspended' },
  });

  console.log(`[BHD] trial expiry: suspended ${expired.length} company(ies):`, expired.map((c) => c.slug).join(', '));
  return { suspended: expired.length, slugs: expired.map((c) => c.slug) };
}

export function startTrialExpiryJob() {
  const tick = () => {
    runTrialExpiryCheck().catch((e) => console.warn('[BHD] trial expiry check failed', e));
  };
  tick();
  const timer = setInterval(tick, INTERVAL_MS);
  if (timer.unref) timer.unref();
  return timer;
}
