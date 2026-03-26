import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { SignatureRequest } from '@/lib/signatureRequests';

function findSignatureInBooking(booking: any, token: string): SignatureRequest | null {
  const list = Array.isArray(booking?.signatureRequests) ? (booking.signatureRequests as SignatureRequest[]) : [];
  const found = list.find((r) => String(r?.token) === token);
  return found ?? null;
}

function splitName(full?: string) {
  const parts = String(full || '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ') || '',
  };
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await ctx.params;
    const sigToken = String(token || '').trim();
    if (!sigToken) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

    const rows = await prisma.bookingStorage.findMany({
      select: { bookingId: true, data: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 5000,
    });

    for (const r of rows) {
      if (!r.data) continue;
      try {
        const booking = JSON.parse(r.data);
        const found = findSignatureInBooking(booking, sigToken);
        if (!found) continue;
        return NextResponse.json({
          ok: true,
          request: {
            token: found.token,
            bookingId: found.bookingId,
            contractKind: found.contractKind,
            actorRole: found.actorRole,
            actorPhone: found.actorPhone,
            status: found.status,
            createdAt: found.createdAt,
            completedAt: found.completedAt,
            failedAt: found.failedAt,
            failureCount: found.failureCount,
            lastError: found.lastError,
          },
          booking: {
            id: booking?.id ?? r.bookingId,
            name: booking?.name,
            phone: booking?.phone,
            contractStage: booking?.contractStage,
            contractKind: booking?.contractKind,
          },
        });
      } catch {
        // ignore bad rows
      }
    }

    return NextResponse.json({ error: 'Token not found' }, { status: 404 });
  } catch (e) {
    console.error('signature-request/[token] GET error:', e);
    return NextResponse.json({ error: 'Failed to load signature request' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await ctx.params;
    const sigToken = String(token || '').trim();
    if (!sigToken) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

    const body = (await req.json()) as Partial<{
      selfieDataUrl: string;
      signatureDataUrl: string;
      idCardFrontDataUrl: string;
      idCardBackDataUrl: string;
      signatureName: string;
      deviceInfo: string;
    }>;

    const selfieDataUrl = typeof body.selfieDataUrl === 'string' ? body.selfieDataUrl : '';
    const signatureDataUrl = typeof body.signatureDataUrl === 'string' ? body.signatureDataUrl : '';
    const idCardFrontDataUrl = typeof body.idCardFrontDataUrl === 'string' ? body.idCardFrontDataUrl : '';
    const idCardBackDataUrl = typeof body.idCardBackDataUrl === 'string' ? body.idCardBackDataUrl : '';
    const signatureName = typeof body.signatureName === 'string' ? body.signatureName.trim() : '';
    const deviceInfo = typeof body.deviceInfo === 'string' ? body.deviceInfo.slice(0, 500) : '';

    if (
      !selfieDataUrl.startsWith('data:image/') ||
      !signatureDataUrl.startsWith('data:image/') ||
      !idCardFrontDataUrl.startsWith('data:image/') ||
      !idCardBackDataUrl.startsWith('data:image/')
    ) {
      return NextResponse.json({ error: 'Missing selfie/signature/id-card images' }, { status: 400 });
    }

    const rows = await prisma.bookingStorage.findMany({
      select: { bookingId: true, data: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 5000,
    });

    for (const r of rows) {
      if (!r.data) continue;
      try {
        const booking = JSON.parse(r.data);
        const list = Array.isArray(booking?.signatureRequests) ? (booking.signatureRequests as SignatureRequest[]) : [];
        const idx = list.findIndex((x) => String(x?.token) === sigToken);
        if (idx === -1) continue;

        const now = new Date().toISOString();
        const cur = list[idx] as SignatureRequest;
        if (cur.status === 'COMPLETED') {
          return NextResponse.json({ ok: true, request: cur });
        }
        const updated: SignatureRequest = {
          ...cur,
          status: 'COMPLETED',
          completedAt: now,
          selfieDataUrl,
          signatureDataUrl,
          idCardFrontDataUrl,
          idCardBackDataUrl,
          signatureName: signatureName || cur.signatureName,
          deviceInfo,
        };
        list[idx] = updated;

        // بعد نجاح التوقيع: نُحدّث مرحلة العقد فقط الآن (بدلاً من الاعتماد عند النقر)
        const cd = (booking?.contractData || {}) as Record<string, any>;
        const sigActor = splitName(updated.signatureName);
        if (updated.actorRole === 'CLIENT' && booking?.contractStage === 'ADMIN_APPROVED') {
          booking.contractStage = 'TENANT_APPROVED';
          booking.contractData = {
            ...cd,
            status: 'TENANT_APPROVED',
            tenantApprovedAt: now,
            tenantApprovedByFirstName: sigActor.firstName || cd.tenantApprovedByFirstName,
            tenantApprovedByLastName: sigActor.lastName || cd.tenantApprovedByLastName,
            updatedAt: now,
            contractUpdatedByFirstName: sigActor.firstName || cd.contractUpdatedByFirstName,
            contractUpdatedByLastName: sigActor.lastName || cd.contractUpdatedByLastName,
          };
        } else if (updated.actorRole === 'OWNER' && booking?.contractStage === 'TENANT_APPROVED') {
          booking.contractStage = 'LANDLORD_APPROVED';
          booking.contractData = {
            ...cd,
            status: 'LANDLORD_APPROVED',
            landlordApprovedAt: now,
            landlordApprovedByFirstName: sigActor.firstName || cd.landlordApprovedByFirstName,
            landlordApprovedByLastName: sigActor.lastName || cd.landlordApprovedByLastName,
            updatedAt: now,
            contractUpdatedByFirstName: sigActor.firstName || cd.contractUpdatedByFirstName,
            contractUpdatedByLastName: sigActor.lastName || cd.contractUpdatedByLastName,
          };
        }
        booking.signatureRequests = list;

        await prisma.bookingStorage.update({
          where: { bookingId: r.bookingId },
          data: { data: JSON.stringify(booking), updatedAt: new Date() },
        });

        return NextResponse.json({ ok: true, request: updated });
      } catch {
        // ignore bad rows
      }
    }

    return NextResponse.json({ error: 'Token not found' }, { status: 404 });
  } catch (e) {
    console.error('signature-request/[token] POST error:', e);
    return NextResponse.json({ error: 'Failed to submit signature' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await ctx.params;
    const sigToken = String(token || '').trim();
    if (!sigToken) return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    const body = (await req.json().catch(() => ({}))) as { error?: string };
    const err = String(body?.error || '').slice(0, 300);

    const rows = await prisma.bookingStorage.findMany({
      select: { bookingId: true, data: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 5000,
    });
    for (const r of rows) {
      if (!r.data) continue;
      try {
        const booking = JSON.parse(r.data);
        const list = Array.isArray(booking?.signatureRequests) ? (booking.signatureRequests as SignatureRequest[]) : [];
        const idx = list.findIndex((x) => String(x?.token) === sigToken);
        if (idx === -1) continue;
        const cur = list[idx];
        if (cur.status === 'COMPLETED') return NextResponse.json({ ok: true, request: cur });
        const now = new Date().toISOString();
        const updated: SignatureRequest = {
          ...cur,
          status: 'FAILED',
          failedAt: now,
          failureCount: Number(cur.failureCount || 0) + 1,
          lastError: err || cur.lastError,
        };
        list[idx] = updated;
        booking.signatureRequests = list;
        await prisma.bookingStorage.update({
          where: { bookingId: r.bookingId },
          data: { data: JSON.stringify(booking), updatedAt: new Date() },
        });
        return NextResponse.json({ ok: true, request: updated });
      } catch {
        // ignore
      }
    }
    return NextResponse.json({ error: 'Token not found' }, { status: 404 });
  } catch (e) {
    console.error('signature-request/[token] PATCH error:', e);
    return NextResponse.json({ error: 'Failed to mark signing failure' }, { status: 500 });
  }
}

