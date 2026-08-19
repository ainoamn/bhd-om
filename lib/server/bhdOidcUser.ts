import { prisma } from '@/lib/prisma';
import { generateBhdSerial } from '@/lib/server/serialNumbers';
import type { IdentityProfile } from '@/lib/bhd/identity';

export async function upsertOfficeUserFromIdentity(profile: IdentityProfile) {
  const bySub = await prisma.user.findUnique({ where: { bhdSub: profile.sub } });
  if (bySub) {
    return prisma.user.update({
      where: { id: bySub.id },
      data: {
        name: profile.name || bySub.name,
        email: profile.email,
        ...(profile.phone && !bySub.phone ? { phone: profile.phone } : {}),
      },
    });
  }

  const byEmail = await prisma.user.findUnique({ where: { email: profile.email } });
  if (byEmail) {
    return prisma.user.update({
      where: { id: byEmail.id },
      data: {
        bhdSub: profile.sub,
        name: profile.name || byEmail.name,
        ...(profile.phone && !byEmail.phone ? { phone: profile.phone } : {}),
      },
    });
  }

  const serialNumber = await generateBhdSerial('USR-C');
  return prisma.user.create({
    data: {
      email: profile.email,
      name: profile.name,
      password: '',
      serialNumber,
      role: 'CLIENT',
      bhdSub: profile.sub,
      phone: profile.phone,
    },
  });
}
