/**
 * Webhook موحد لجميع بوابات الدفع — يربط النجاح بالحسابات
 */
import { NextRequest, NextResponse } from 'next/server';
import { recordPayment, recordRefund } from '@/lib/payment/accounting-link';
import { verifyPayment, isValidProvider, type PaymentProvider } from '@/lib/payment/manager';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const provider = searchParams.get('provider') || '';

    if (!isValidProvider(provider)) {
      return NextResponse.json({ error: 'بوابة غير مدعومة' }, { status: 400 });
    }

    const contentType = req.headers.get('content-type') || '';
    let body: Record<string, unknown> = {};

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      formData.forEach((value, key) => {
        body[key] = value;
      });
    } else {
      body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    }

    const sessionId = extractSessionId(provider, body, searchParams);
    if (!sessionId) {
      return NextResponse.json({ error: 'لا يوجد sessionId' }, { status: 400 });
    }

    const eventType = extractEventType(provider, body);
    if (isRefundEvent(eventType, provider)) {
      const verification = await verifyPayment(provider, sessionId);
      if (!verification.paid) {
        return NextResponse.json({ ok: true, status: 'refund_not_verified' });
      }
      const metadata = extractMetadata(provider, body);
      const result = await recordRefund({
        provider,
        sessionId,
        reference: verification.reference,
        amount: verification.amount,
        customerEmail: metadata.email || 'unknown@bhd-om.com',
        customerName: metadata.name,
        description: metadata.description || `استرداد عبر ${provider}`,
        userId: metadata.userId,
      });
      return NextResponse.json({ ok: result.success, status: 'refund_recorded', ...result });
    }

    if (isCancelledEvent(eventType, provider)) {
      return NextResponse.json({ ok: true, status: 'cancelled_ignored' });
    }

    const verification = await verifyPayment(provider, sessionId);
    if (!verification.paid) {
      return NextResponse.json({ ok: true, status: 'not_paid_yet', provider, sessionId });
    }

    const metadata = extractMetadata(provider, body);
    const result = await recordPayment({
      provider,
      sessionId,
      reference: verification.reference,
      amount: verification.amount,
      customerEmail: metadata.email || 'unknown@bhd-om.com',
      customerName: metadata.name,
      description: metadata.description || `دفع عبر ${provider}`,
      userId: metadata.userId,
      dueId: metadata.dueId,
      paidAt: new Date(),
    });

    if (!result.success) {
      console.error(`[Webhook ${provider}] Accounting failed:`, result.error);
    }

    return NextResponse.json({
      ok: result.success,
      status: result.success ? 'recorded' : 'accounting_failed',
      journalEntryId: result.journalEntryId,
      serialNumber: result.serialNumber,
      amount: verification.amount,
      provider,
      duplicate: result.duplicate,
      error: result.error,
    });
  } catch (error) {
    console.error('[Webhook Payment] Error:', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown' },
      { status: 200 }
    );
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function extractSessionId(
  provider: string,
  body: Record<string, unknown>,
  searchParams: URLSearchParams
): string {
  const data = asRecord(body.data);
  const resource = asRecord(body.resource);
  const result = asRecord(body.result);
  const customerDetails = asRecord(body.customer_details);
  const customer = asRecord(body.customer);
  const statusObj = asRecord(body.status);

  switch (provider) {
    case 'thawani':
      return String(data.session_id || body.session_id || searchParams.get('sessionId') || '');
    case 'stripe':
      return String(asRecord(data.object).id || searchParams.get('session_id') || '');
    case 'paypal':
      return String(resource.id || searchParams.get('token') || '');
    case 'hyperpay':
      return String(body.id || searchParams.get('id') || '');
    case 'paytabs':
      return String(body.tran_ref || searchParams.get('tranRef') || '');
    case 'tap':
      return String(body.id || searchParams.get('tap_id') || '');
    case 'myfatoorah':
      return String(asRecord(body.Data).InvoiceId || searchParams.get('paymentId') || '');
    case 'telr':
      return String(body.order_ref || searchParams.get('orderRef') || '');
    case 'payfort':
      return String(body.fort_id || searchParams.get('fortId') || '');
    case 'network-intl':
      return String(body.reference || searchParams.get('ref') || '');
    case 'cmi':
      return String(body.oid || searchParams.get('orderRef') || '');
    default:
      return searchParams.get('sessionId') || '';
  }
}

function extractEventType(provider: string, body: Record<string, unknown>): string {
  switch (provider) {
    case 'stripe':
      return String(body.type || '');
    case 'thawani':
    case 'paypal':
      return String(body.event_type || '');
    case 'hyperpay':
      return String(asRecord(body.result).code || '');
    case 'paytabs':
      return String(body.tran_type || '');
    case 'tap':
      return String(body.status || '');
    case 'myfatoorah':
      return String(body.EventType || '');
    case 'telr':
      return String(asRecord(body.status).code || '');
    case 'payfort':
      return String(body.status || '');
    default:
      return String(body.status || body.event || '');
  }
}

function isCancelledEvent(eventType: string, provider: string): boolean {
  const lower = eventType.toLowerCase();
  const cancelPatterns: Record<string, string[]> = {
    stripe: ['cancel', 'fail', 'payment_intent.payment_failed'],
    paypal: ['voided', 'declined'],
    thawani: ['cancel', 'fail'],
    hyperpay: ['cancel', 'reject'],
    paytabs: ['cancel', 'void'],
    tap: ['cancel', 'void'],
    myfatoorah: ['cancel', 'failed'],
    telr: ['2'],
    payfort: ['cancel', 'declined'],
  };
  const patterns = cancelPatterns[provider] || ['cancel', 'fail'];
  return patterns.some((pattern) => lower.includes(pattern.toLowerCase()));
}

function isRefundEvent(eventType: string, provider: string): boolean {
  const lower = eventType.toLowerCase();
  const refundPatterns: Record<string, string[]> = {
    stripe: ['charge.refunded', 'refund'],
    paypal: ['payment.capture.refunded', 'refund'],
    thawani: ['refund'],
    paytabs: ['refund'],
    tap: ['refund'],
    myfatoorah: ['refund'],
  };
  const patterns = refundPatterns[provider] || ['refund'];
  return patterns.some((pattern) => lower.includes(pattern.toLowerCase()));
}

function extractMetadata(
  provider: string,
  body: Record<string, unknown>
): {
  email?: string;
  name?: string;
  userId?: string;
  dueId?: string;
  description?: string;
} {
  const data = asRecord(body.data);
  const object = asRecord(data.object);
  const metadata = asRecord(object.metadata);
  const dataMetadata = asRecord(data.metadata);
  const customerDetails = asRecord(body.customer_details);
  const customer = asRecord(body.customer);
  const mfData = asRecord(body.Data);

  switch (provider) {
    case 'stripe':
      return {
        email: String(object.customer_email || ''),
        userId: String(metadata.userId || ''),
        dueId: String(metadata.dueId || ''),
        description: String(object.description || ''),
      };
    case 'thawani':
      return {
        email: String(dataMetadata.customer_email || ''),
        userId: String(dataMetadata.userId || ''),
        dueId: String(dataMetadata.dueId || ''),
      };
    case 'hyperpay':
      return {
        email: String(customer.email || ''),
        description: String(body.description || ''),
      };
    case 'paytabs':
      return {
        email: String(customerDetails.email || ''),
        description: String(body.cart_description || ''),
      };
    case 'tap':
      return {
        email: String(customer.email || ''),
        description: String(body.description || ''),
      };
    case 'myfatoorah':
      return {
        email: String(mfData.CustomerEmail || ''),
        description: String(mfData.InvoiceDisplayValue || ''),
      };
    default:
      return {
        email: String(body.customer_email || body.email || ''),
        description: String(body.description || body.memo || ''),
      };
  }
}
