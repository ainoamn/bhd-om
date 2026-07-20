/**
 * API Route: التوقيع الذكي للعقود
 * يدعم: OTP عبر SMS/Email + QR Code + رسم التوقيع
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

/** توليد OTP عشوائي */
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/** تشفير OTP */
function hashOTP(otp: string): string {
  return crypto.createHash('sha256').update(`${otp}:${process.env.ENCRYPTION_MASTER_KEY}`).digest('hex');
}

/** إرسال OTP (محاكاة — يمكن ربطها بـ Twilio/SMS gateway) */
async function sendOTP(to: string, otp: string, method: 'SMS' | 'EMAIL'): Promise<void> {
  console.log(`[OTP] Sending ${method} to ${to}: ${otp}`);
  // TODO: ربط بـ Twilio للـ SMS أو SendGrid للـ Email
}

// ========== POST: إنشاء/إرسال توقيع ==========
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const userId = auth.userId!;

    const { contractId, method, sendTo } = await req.json();
    if (!contractId || !method || !sendTo) {
      return NextResponse.json({ error: 'contractId, method, sendTo required' }, { status: 400 });
    }

    const otp = generateOTP();
    const otpHash = hashOTP(otp);
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 دقائق

    // حفظ في قاعدة البيانات
    const signature = await prisma.smartSignature.create({
      data: {
        contractId,
        tenantId: userId,
        method: method === 'SMS' ? 'OTP_SMS' : method === 'EMAIL' ? 'OTP_EMAIL' : 'DRAW',
        status: 'SENT',
        otpCode: otpHash,
        otpSentTo: sendTo,
        otpExpiry,
      },
    });

    // إرسال OTP
    await sendOTP(sendTo, otp, method);

    return NextResponse.json({
      signatureId: signature.id,
      message: `تم إرسال كود التحقق إلى ${sendTo}`,
      expiresAt: otpExpiry,
    });
  } catch (error) {
    console.error('[Signature] Error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// ========== PUT: التحقق من OTP وتسجيل التوقيع ==========
export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    const userId = auth.userId;

    const { signatureId, otp, signatureData } = await req.json();
    if (!signatureId || !otp) {
      return NextResponse.json({ error: 'signatureId and otp required' }, { status: 400 });
    }

    const record = await prisma.smartSignature.findUnique({ where: { id: signatureId } });
    if (!record) return NextResponse.json({ error: 'Signature not found' }, { status: 404 });
    if (record.status === 'SIGNED') return NextResponse.json({ error: 'Already signed' }, { status: 400 });
    if (record.otpExpiry && record.otpExpiry < new Date()) return NextResponse.json({ error: 'OTP expired' }, { status: 400 });

    // التحقق من OTP
    const otpHash = hashOTP(otp);
    if (record.otpCode !== otpHash) {
      return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 });
    }

    // تسجيل التوقيع
    await prisma.smartSignature.update({
      where: { id: signatureId },
      data: {
        status: 'SIGNED',
        signatureData: signatureData || null,
        signedAt: new Date(),
        ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'تم التوقيع بنجاح',
      signedAt: new Date(),
    });
  } catch (error) {
    console.error('[Signature Verify] Error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
