import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRoles } from '@/lib/auth/guard';
import { getPaymentGatewayStatus } from '@/lib/server/paymentGateway';

export const dynamic = 'force-dynamic';

/** GET — مراجعة جاهزية بوابة الدفع (Thawani vs mock) */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const forbidden = requireRoles(auth, ['ADMIN', 'SUPER_ADMIN']);
  if (forbidden) return forbidden;

  return NextResponse.json(getPaymentGatewayStatus(), {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
