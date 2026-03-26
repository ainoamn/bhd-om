import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import { buildSignatureLink, generateSignatureToken, type SignatureActorRole, type SignatureRequest } from '@/lib/signatureRequests';

type CreateBody = {
  bookingId: string;
  actorRole: SignatureActorRole;
  actorPhone?: string;
  contractKind?: 'RENT' | 'SALE' | 'INVESTMENT';
  locale?: string;
};

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV === 'development' ? 'bhd-dev-secret-not-for-production' : undefined),
    });
    if (!token?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json()) as Partial<CreateBody>;
    const bookingId = typeof body.bookingId === 'string' ? body.bookingId.trim() : '';
    const actorRole = body.actorRole;
    const actorPhone = typeof body.actorPhone === 'string' ? body.actorPhone.trim() : undefined;
    const contractKind = body.contractKind;
    const locale = typeof body.locale === 'string' && body.locale ? body.locale : 'ar';

    if (!bookingId || !actorRole) {
      return NextResponse.json({ error: 'Missing bookingId/actorRole' }, { status: 400 });
    }

    const row = await prisma.bookingStorage.findUnique({ where: { bookingId } });
    if (!row?.data) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

    let booking: any;
    try {
      booking = JSON.parse(row.data);
    } catch {
      return NextResponse.json({ error: 'Invalid booking data' }, { status: 500 });
    }

    const sigToken = generateSignatureToken();
    const now = new Date().toISOString();

    const reqObj: SignatureRequest = {
      token: sigToken,
      bookingId,
      contractKind: contractKind,
      actorRole,
      actorPhone,
      createdAt: now,
      status: 'PENDING',
    };

    const list: SignatureRequest[] = Array.isArray(booking.signatureRequests) ? booking.signatureRequests : [];
    // إلغاء أي طلب توقيع معلّق لنفس الطرف قبل إنشاء طلب جديد
    for (const item of list) {
      if (item.actorRole === actorRole && item.status === 'PENDING') {
        item.status = 'CANCELLED';
      }
    }

    // معالجة بيانات قديمة: إذا أُنشئ طلب توقيع جديد، نُرجع المرحلة خطوة للخلف
    // حتى لا يظهر "معتمد" قبل اكتمال التوقيع فعلياً.
    if (actorRole === 'CLIENT' && booking.contractStage === 'TENANT_APPROVED') {
      booking.contractStage = 'ADMIN_APPROVED';
      const cd = (booking.contractData || {}) as Record<string, unknown>;
      booking.contractData = {
        ...cd,
        status: 'ADMIN_APPROVED',
        tenantApprovedAt: undefined,
        tenantApprovedByFirstName: undefined,
        tenantApprovedByLastName: undefined,
        tenantApprovedBySerial: undefined,
      };
    } else if (actorRole === 'OWNER' && booking.contractStage === 'LANDLORD_APPROVED') {
      booking.contractStage = 'TENANT_APPROVED';
      const cd = (booking.contractData || {}) as Record<string, unknown>;
      booking.contractData = {
        ...cd,
        status: 'TENANT_APPROVED',
        landlordApprovedAt: undefined,
        landlordApprovedByFirstName: undefined,
        landlordApprovedByLastName: undefined,
        landlordApprovedBySerial: undefined,
      };
    }

    list.unshift(reqObj);
    booking.signatureRequests = list;

    await prisma.bookingStorage.update({
      where: { bookingId },
      data: { data: JSON.stringify(booking), updatedAt: new Date() },
    });

    const origin = req.nextUrl.origin;
    const link = buildSignatureLink(origin, locale, sigToken);
    return NextResponse.json({ ok: true, token: sigToken, link, request: reqObj });
  } catch (e) {
    console.error('signature-request/create error:', e);
    return NextResponse.json({ error: 'Failed to create signature request' }, { status: 500 });
  }
}

