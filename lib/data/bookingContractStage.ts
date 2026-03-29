import type { PropertyBooking } from '@/lib/data/bookings';

type ContractStage =
  | 'DRAFT'
  | 'ADMIN_APPROVED'
  | 'TENANT_APPROVED'
  | 'LANDLORD_APPROVED'
  | 'APPROVED'
  | 'CANCELLED';

/**
 * يستنتج مرحلة العرض من contractStage + signatureRequests (نفس منطق حجوزاتي).
 * يُستخدم لأزرار الإجراءات ولتسمية المرحلة عندما يكون التوثيق على الخادم متقدماً عن حقل contractStage.
 */
export function inferBookingContractStage(
  booking: PropertyBooking | undefined,
  fallbackStage?: string
): ContractStage | undefined {
  const stage = (booking?.contractStage || fallbackStage) as ContractStage | undefined;
  const reqs: unknown[] = Array.isArray(
    (booking as PropertyBooking & { signatureRequests?: unknown[] })?.signatureRequests
  )
    ? ((booking as PropertyBooking & { signatureRequests: unknown[] }).signatureRequests ?? [])
    : [];
  const hasMedia = (role: 'CLIENT' | 'OWNER') => {
    const r = reqs.find(
      (x) =>
        String((x as { actorRole?: string })?.actorRole) === role &&
        String((x as { status?: string })?.status) === 'COMPLETED'
    );
    return !!(
      r &&
      (r as { selfieDataUrl?: string }).selfieDataUrl &&
      (r as { signatureDataUrl?: string }).signatureDataUrl &&
      (r as { idCardFrontDataUrl?: string }).idCardFrontDataUrl &&
      (r as { idCardBackDataUrl?: string }).idCardBackDataUrl
    );
  };
  const clientDone = hasMedia('CLIENT');
  const ownerDone = hasMedia('OWNER');
  if (stage === 'ADMIN_APPROVED' && clientDone) return 'TENANT_APPROVED';
  if (stage === 'TENANT_APPROVED' && ownerDone) return 'LANDLORD_APPROVED';
  if (clientDone && !ownerDone) return 'TENANT_APPROVED';
  if (clientDone && ownerDone && stage !== 'APPROVED') return 'LANDLORD_APPROVED';
  return stage;
}

/**
 * مرحلة العرض في صفحة مراجعة العقد: تدمج الاستنتاج أعلاه مع إعادة خطوة للخلف عند وجود طلب توقيع معلّق/فاشل
 * (تصحيح) حتى يظهر زر التوقيع/الاعتماد للطرف الصحيح.
 */
export function getContractReviewDisplayStage(booking: PropertyBooking | null | undefined): ContractStage | undefined {
  if (!booking) return undefined;
  const raw = booking.contractStage as ContractStage | undefined;
  const inferred = inferBookingContractStage(booking, raw);
  const reqs = Array.isArray((booking as PropertyBooking & { signatureRequests?: unknown[] }).signatureRequests)
    ? (((booking as PropertyBooking & { signatureRequests: unknown[] }).signatureRequests ?? []) as {
        actorRole?: string;
        status?: string;
      }[])
    : [];
  /** الأحدث أولاً في التخزين — أول تطابق هو الطلب النشط */
  const latestClient = reqs.find((r) => String(r?.actorRole) === 'CLIENT');
  const latestOwner = reqs.find((r) => String(r?.actorRole) === 'OWNER');
  const clientPendingOrFailed = ['PENDING', 'FAILED'].includes(String(latestClient?.status || ''));
  const ownerPendingOrFailed = ['PENDING', 'FAILED'].includes(String(latestOwner?.status || ''));
  if (raw === 'TENANT_APPROVED' && clientPendingOrFailed) return 'ADMIN_APPROVED';
  if (raw === 'LANDLORD_APPROVED' && ownerPendingOrFailed) return 'TENANT_APPROVED';
  return inferred;
}
