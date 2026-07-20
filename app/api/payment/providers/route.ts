/**
 * قائمة بوابات الدفع المتاحة
 */
import { NextResponse } from 'next/server';
import { getAllProviders } from '@/lib/payment/manager';

export async function GET() {
  try {
    const providers = getAllProviders();
    return NextResponse.json({
      success: true,
      providers,
      enabledCount: providers.filter((p) => p.enabled).length,
    });
  } catch (error) {
    console.error('[Payment Providers] Error:', error);
    return NextResponse.json({ error: 'فشل جلب قائمة البوابات' }, { status: 500 });
  }
}
