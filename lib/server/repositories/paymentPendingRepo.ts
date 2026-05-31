import { prisma } from '@/lib/prisma';

export async function savePaymentPending(params: {
  sessionId: string;
  userId?: string;
  propertyId: number;
  bookingPayload: Record<string, unknown>;
}) {
  const bookingPayload = JSON.stringify(params.bookingPayload);
  await prisma.paymentPendingStorage.upsert({
    where: { sessionId: params.sessionId },
    create: {
      sessionId: params.sessionId,
      userId: params.userId || null,
      propertyId: params.propertyId,
      bookingPayload,
      status: 'PENDING',
    },
    update: {
      userId: params.userId || null,
      propertyId: params.propertyId,
      bookingPayload,
      updatedAt: new Date(),
    },
  });
}

export async function getPaymentPending(sessionId: string) {
  return prisma.paymentPendingStorage.findUnique({ where: { sessionId } });
}

export async function markPaymentPendingStatus(
  sessionId: string,
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'FAILED'
) {
  await prisma.paymentPendingStorage.update({
    where: { sessionId },
    data: { status, updatedAt: new Date() },
  });
}
